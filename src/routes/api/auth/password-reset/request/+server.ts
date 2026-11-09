import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, withTransaction } from '$lib/db';
import { loginBlocked, recordLoginFailure, sendResetMail } from '$lib/server/accounts';
import { handle, readBody, requireString } from '$lib/server/validate';

/**
 * POST { email } always answers 200 so the response does not reveal
 * whether an address has an account. Shares the login rate limit keyed
 * by address so it cannot be used to flood someone's inbox.
 */
export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
  return handle('Request password reset', async () => {
    const email = requireString(await readBody(request), 'email', 254).toLowerCase();
    const address = getClientAddress();
    if (await loginBlocked(`reset:${email}`, address)) {
      return json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
    }
    await recordLoginFailure(`reset:${email}`, address);
    const result = await query<{ id: string; email: string }>('SELECT id, email FROM users WHERE email = $1', [email]);
    if (result.rows[0]) {
      try {
        await withTransaction((client) => sendResetMail(client, result.rows[0], url.origin));
      } catch (error) {
        // A delivery error must not reveal whether the address has an account.
        // Keep the failure visible to operators; the transaction rolls back.
        console.error('Password reset delivery failed:', error);
      }
    }
    return json({ success: true });
  });
};
