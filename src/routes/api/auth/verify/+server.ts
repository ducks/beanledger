import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, query } from '$lib/db';
import { consumeEmailToken } from '$lib/server/accounts';
import { handle, readBody, requireString } from '$lib/server/validate';

/** POST { token } marks the token's user as verified. Works signed out. */
export const POST: RequestHandler = async ({ request }) => {
  return handle('Verify email', async () => {
    const token = requireString(await readBody(request), 'token', 128);
    const userId = await consumeEmailToken(getDb(), token, 'verify');
    if (!userId) return json({ error: 'This verification link is invalid or has expired' }, { status: 400 });
    await query('UPDATE users SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP) WHERE id = $1', [userId]);
    return json({ success: true });
  });
};
