import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withTransaction } from '$lib/db';
import { hashPassword } from '$lib/auth';
import { consumeEmailToken, revokeSessions } from '$lib/server/accounts';
import { handle, readBody, requireString, ValidationError } from '$lib/server/validate';

/** POST { token, password } sets the password and signs out every session. */
export const POST: RequestHandler = async ({ request, cookies }) => {
  return handle('Reset password', async () => {
    const body = await readBody(request);
    const token = requireString(body, 'token', 128);
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8 || password.length > 256) {
      throw new ValidationError('Password must be between 8 and 256 characters');
    }
    const passwordHash = await hashPassword(password);
    const ok = await withTransaction(async (client) => {
      const userId = await consumeEmailToken(client, token, 'reset');
      if (!userId) return false;
      await client.query('UPDATE users SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP) WHERE id = $2', [passwordHash, userId]);
      await revokeSessions(client, userId);
      return true;
    });
    if (!ok) return json({ error: 'This reset link is invalid or has expired' }, { status: 400 });
    cookies.delete('session', { path: '/' });
    return json({ success: true });
  });
};
