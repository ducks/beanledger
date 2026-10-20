import { json } from '@sveltejs/kit';

/** Owner-only routes return this when the caller is signed in as staff. */
export function requireOwner(locals: App.Locals): Response | null {
  if (!locals.user || !locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  if (locals.user.role !== 'owner') return json({ error: 'Only an owner can do that' }, { status: 403 });
  return null;
}
