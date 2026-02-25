import { json } from '@sveltejs/kit';
import { query } from '$lib/db';
import type { RoastGroup } from '$lib/types';

export async function GET() {
  const result = await query<RoastGroup>('SELECT * FROM roast_groups ORDER BY created_at DESC');
  return json(result.rows);
}

export async function POST({ request }) {
  const group: RoastGroup = await request.json();

  const result = await query(
    `INSERT INTO roast_groups (id, label, tag, batch_type, roast_loss_pct, type, components, active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      group.id,
      group.label,
      group.tag,
      group.batch_type,
      group.roast_loss_pct,
      group.type,
      JSON.stringify(group.components || []),
      group.active,
      group.created_at
    ]
  );

  return json(result.rows[0], { status: 201 });
}

export async function PUT({ request }) {
  const group: RoastGroup = await request.json();

  const result = await query(
    `UPDATE roast_groups
     SET label = $2, tag = $3, batch_type = $4, roast_loss_pct = $5,
         type = $6, components = $7, active = $8, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [
      group.id,
      group.label,
      group.tag,
      group.batch_type,
      group.roast_loss_pct,
      group.type,
      JSON.stringify(group.components || [])
    ]
  );

  return json(result.rows[0]);
}

export async function DELETE({ url }) {
  const id = url.searchParams.get('id');
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }

  await query('DELETE FROM roast_groups WHERE id = $1', [id]);
  return json({ success: true });
}
