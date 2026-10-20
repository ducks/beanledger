import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { verifyPassword, generateSessionId } from '$lib/auth';
import { clearLoginFailures, loginBlocked, pruneAuthTables, recordLoginFailure } from '$lib/server/accounts';
import { handle, readBody, requireString } from '$lib/server/validate';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  return handle('Login', async () => {
    const body = await readBody(request);
    const username = requireString(body, 'username', 64);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password) return json({ error: 'Username and password are required' }, { status: 400 });

    const address = getClientAddress();
    if (await loginBlocked(username, address)) {
      return json({ error: 'Too many failed attempts. Try again in a few minutes.' }, { status: 429 });
    }

    const userResult = await query(
      'SELECT id, username, email, password_hash, tenant_id, role, created_at FROM users WHERE username = $1',
      [username]
    );
    const user = userResult.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await recordLoginFailure(username, address);
      return json({ error: 'Invalid username or password' }, { status: 401 });
    }

    await clearLoginFailures(username);
    await pruneAuthTables();

    const sessionId = generateSessionId();
    await query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + make_interval(days => 30))', [sessionId, user.id]);
    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30
    });

    return json({
      user: { id: user.id, username: user.username, email: user.email, tenant_id: user.tenant_id, role: user.role, created_at: user.created_at }
    });
  });
};
