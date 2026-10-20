import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, query, withTransaction } from '$lib/db';
import { hashPassword, generateSessionId } from '$lib/auth';
import { findInvite } from '$lib/server/accounts';
import { handle, readBody, requireString, ValidationError } from '$lib/server/validate';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;

/** GET ?token= describes a live invite for the accept page. */
export const GET: RequestHandler = async ({ url }) => {
  return handle('Look up invite', async () => {
    const token = url.searchParams.get('token') ?? '';
    const invite = token ? await findInvite(getDb(), token) : null;
    if (!invite) return json({ error: 'This invitation is invalid or has expired' }, { status: 404 });
    const tenant = await query<{ name: string }>('SELECT name FROM tenants WHERE id = $1', [invite.tenant_id]);
    return json({ email: invite.email, role: invite.role, tenant: tenant.rows[0]?.name ?? '' });
  });
};

/** POST { token, username, password } creates the invited user, already
 *  verified (the link proved the address), and signs them in. */
export const POST: RequestHandler = async ({ request, cookies }) => {
  return handle('Accept invite', async () => {
    const body = await readBody(request);
    const token = requireString(body, 'token', 128);
    const username = requireString(body, 'username', 32);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!USERNAME_PATTERN.test(username)) throw new ValidationError('Username must be 3-32 characters of letters, digits, _ . -');
    if (password.length < 8 || password.length > 256) throw new ValidationError('Password must be between 8 and 256 characters');

    const passwordHash = await hashPassword(password);
    const sessionId = generateSessionId();
    const outcome = await withTransaction(async (client) => {
      const invite = await findInvite(client, token);
      if (!invite) return { kind: 'invalid' as const };
      const taken = await client.query('SELECT 1 FROM users WHERE username = $1 OR email = $2', [username, invite.email]);
      if (taken.rows.length > 0) return { kind: 'taken' as const };
      const created = await client.query(
        `INSERT INTO users (username, email, password_hash, tenant_id, role, email_verified_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id, username, email, tenant_id, role, created_at`,
        [username, invite.email, passwordHash, invite.tenant_id, invite.role]
      );
      await client.query('UPDATE invites SET accepted_at = CURRENT_TIMESTAMP WHERE id = $1', [invite.id]);
      await client.query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + make_interval(days => 30))', [sessionId, created.rows[0].id]);
      return { kind: 'ok' as const, user: created.rows[0] };
    });

    if (outcome.kind === 'invalid') return json({ error: 'This invitation is invalid or has expired' }, { status: 400 });
    if (outcome.kind === 'taken') return json({ error: 'That username or email already has an account' }, { status: 409 });
    cookies.set('session', sessionId, {
      path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30
    });
    return json({ user: outcome.user });
  });
};
