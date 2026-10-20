import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, query } from '$lib/db';
import { createInvite } from '$lib/server/accounts';
import { requireOwner } from '$lib/server/authz';
import { handle, readBody, requireEnum, requireString, paramId, ValidationError } from '$lib/server/validate';

const ROLES = ['owner', 'staff'] as const;

export const GET: RequestHandler = async ({ locals }) => {
  const denied = requireOwner(locals);
  if (denied) return denied;
  const result = await query(
    `SELECT id, email, role, expires_at, created_at FROM invites
     WHERE tenant_id = $1 AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC`,
    [locals.tenant!.id]
  );
  return json({ invites: result.rows });
};

/** POST { email, role } emails an invitation link. */
export const POST: RequestHandler = async ({ request, locals, url }) => {
  const denied = requireOwner(locals);
  if (denied) return denied;
  const tenant = locals.tenant!;
  return handle('Invite user', async () => {
    const body = await readBody(request);
    const email = requireString(body, 'email', 254).toLowerCase();
    const role = requireEnum(body, 'role', ROLES);
    if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) throw new ValidationError('Email address is not valid');
    const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return json({ error: 'That email already has an account' }, { status: 409 });
    const invite = await createInvite(getDb(), tenant, locals.user!.id, email, role, url.origin);
    return json({ success: true, id: invite.id }, { status: 201 });
  });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  const denied = requireOwner(locals);
  if (denied) return denied;
  return handle('Revoke invite', async () => {
    const id = paramId(url.searchParams.get('id'), 'id');
    const result = await query('DELETE FROM invites WHERE id::text = $1 AND tenant_id = $2 AND accepted_at IS NULL RETURNING id', [id, locals.tenant!.id]);
    if (result.rows.length === 0) return json({ error: 'Invite not found' }, { status: 404 });
    return json({ success: true });
  });
};
