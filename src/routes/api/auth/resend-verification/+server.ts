import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withTransaction } from '$lib/db';
import { consumeRateLimit, sendVerificationMail } from '$lib/server/accounts';
import { handle } from '$lib/server/validate';

export const POST: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const user = locals.user;
  return handle('Resend verification', async () => {
    if (user.email_verified_at) return json({ success: true, already: true });
    if (!(await consumeRateLimit(`verify:user:${user.id}`, 5, 15))) {
      return json({ error: 'Too many verification requests. Try again in a few minutes.' }, { status: 429 });
    }
    await withTransaction((client) => sendVerificationMail(client, user, url.origin));
    return json({ success: true });
  });
};
