import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/db';
import { sendVerificationMail } from '$lib/server/accounts';
import { handle } from '$lib/server/validate';

export const POST: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const user = locals.user;
  return handle('Resend verification', async () => {
    if (user.email_verified_at) return json({ success: true, already: true });
    await sendVerificationMail(getDb(), user, url.origin);
    return json({ success: true });
  });
};
