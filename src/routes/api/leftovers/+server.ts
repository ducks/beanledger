import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { Leftover } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<Leftover>(
    'SELECT * FROM leftovers WHERE tenant_id = $1',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leftover: Leftover = await request.json();

  const result = await query(
    `INSERT INTO leftovers (group_id, lbs, tenant_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id) DO UPDATE SET lbs = $2, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [leftover.group_id, leftover.lbs, locals.tenant.id]
  );

  return json(result.rows[0]);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leftover: Leftover = await request.json();

  const result = await query(
    `UPDATE leftovers
     SET lbs = $2, updated_at = CURRENT_TIMESTAMP
     WHERE group_id = $1 AND tenant_id = $3
     RETURNING *`,
    [leftover.group_id, leftover.lbs, locals.tenant.id]
  );

  return json(result.rows[0]);
};
