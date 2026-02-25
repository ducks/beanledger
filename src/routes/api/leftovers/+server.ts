import { json } from '@sveltejs/kit';
import { query } from '$lib/db';
import type { Leftover } from '$lib/types';

export async function GET() {
  const result = await query<Leftover>('SELECT * FROM leftovers');
  return json(result.rows);
}

export async function POST({ request }) {
  const leftover: Leftover = await request.json();

  const result = await query(
    `INSERT INTO leftovers (group_id, lbs)
     VALUES ($1, $2)
     ON CONFLICT (group_id) DO UPDATE SET lbs = $2, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [leftover.group_id, leftover.lbs]
  );

  return json(result.rows[0]);
}

export async function PUT({ request }) {
  const leftover: Leftover = await request.json();

  const result = await query(
    `UPDATE leftovers
     SET lbs = $2, updated_at = CURRENT_TIMESTAMP
     WHERE group_id = $1
     RETURNING *`,
    [leftover.group_id, leftover.lbs]
  );

  return json(result.rows[0]);
}
