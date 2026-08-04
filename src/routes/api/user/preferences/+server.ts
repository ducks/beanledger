import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';

const VALID_UNITS = new Set(['lbs', 'kg']);

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { preferred_units?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const next = body.preferred_units;
  if (!next || !VALID_UNITS.has(next)) {
    return json({ error: 'preferred_units must be "lbs" or "kg"' }, { status: 400 });
  }

  await query(
    'UPDATE users SET preferred_units = $1 WHERE id = $2',
    [next, locals.user.id]
  );

  return json({ preferred_units: next });
};
