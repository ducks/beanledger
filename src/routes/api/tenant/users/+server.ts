import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, withTransaction } from '$lib/db';
import { revokeSessions } from '$lib/server/accounts';
import { requireOwner } from '$lib/server/authz';
import { handle, readBody, requireEnum, requireString, paramId } from '$lib/server/validate';

const ROLES = ['owner', 'staff'] as const;
const UUID = /^[0-9a-f-]{36}$/i;

/** Owners manage the tenant's users; staff may only see the list. */
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const result = await query(
    `SELECT id, username, email, role, email_verified_at, created_at
     FROM users WHERE tenant_id = $1 ORDER BY created_at`,
    [locals.tenant.id]
  );
  return json({ users: result.rows });
};

/** PATCH { id, role } changes a role; the last owner cannot be demoted. */
export const PATCH: RequestHandler = async ({ request, locals }) => {
  const denied = requireOwner(locals);
  if (denied) return denied;
  const tenantId = locals.tenant!.id;
  return handle('Change role', async () => {
    const body = await readBody(request);
    const id = requireString(body, 'id', 36);
    const role = requireEnum(body, 'role', ROLES);
    if (!UUID.test(id)) return json({ error: 'User not found' }, { status: 404 });
    const outcome = await withTransaction(async (client) => {
      const target = await client.query<{ role: string }>('SELECT role FROM users WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [id, tenantId]);
      if (!target.rows[0]) return 'not-found' as const;
      if (target.rows[0].role === 'owner' && role !== 'owner') {
        const owners = await client.query<{ n: string }>("SELECT COUNT(*) AS n FROM users WHERE tenant_id = $1 AND role = 'owner'", [tenantId]);
        if (parseInt(owners.rows[0].n, 10) <= 1) return 'last-owner' as const;
      }
      await client.query('UPDATE users SET role = $1 WHERE id = $2 AND tenant_id = $3', [role, id, tenantId]);
      return 'ok' as const;
    });
    if (outcome === 'not-found') return json({ error: 'User not found' }, { status: 404 });
    if (outcome === 'last-owner') return json({ error: 'A tenant needs at least one owner' }, { status: 400 });
    return json({ success: true });
  });
};

/** DELETE ?id= removes a user from the tenant and ends their sessions. */
export const DELETE: RequestHandler = async ({ url, locals }) => {
  const denied = requireOwner(locals);
  if (denied) return denied;
  const tenantId = locals.tenant!.id;
  const me = locals.user!.id;
  return handle('Remove user', async () => {
    const id = paramId(url.searchParams.get('id'), 'id');
    if (id === me) return json({ error: 'You cannot remove yourself' }, { status: 400 });
    if (!UUID.test(id)) return json({ error: 'User not found' }, { status: 404 });
    const removed = await withTransaction(async (client) => {
      const target = await client.query('SELECT 1 FROM users WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [id, tenantId]);
      if (!target.rows[0]) return false;
      await revokeSessions(client, id);
      await client.query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      return true;
    });
    if (!removed) return json({ error: 'User not found' }, { status: 404 });
    return json({ success: true });
  });
};
