import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { RoastGroup } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<RoastGroup>(
    'SELECT * FROM roast_groups WHERE tenant_id = $1 ORDER BY created_at DESC',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group: RoastGroup = await request.json();

  const result = await query(
    `INSERT INTO roast_groups (id, label, batch_type, roast_loss_pct, type, components, active, created_at, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      group.id,
      group.label,
      group.batch_type,
      group.roast_loss_pct,
      group.type,
      JSON.stringify(group.components || []),
      group.active,
      group.created_at,
      locals.tenant.id
    ]
  );

  return json(result.rows[0], { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group: RoastGroup = await request.json();

  const result = await query(
    `UPDATE roast_groups
     SET label = $2, batch_type = $3, roast_loss_pct = $4,
         type = $5, components = $6, active = $7, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $8
     RETURNING *`,
    [
      group.id,
      group.label,
      group.batch_type,
      group.roast_loss_pct,
      group.type,
      JSON.stringify(group.components || []),
      group.active,
      locals.tenant.id
    ]
  );

  return json(result.rows[0]);
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    // Delete associated products first
    await query('DELETE FROM products WHERE group_id = $1 AND tenant_id = $2', [id, locals.tenant.id]);

    // Then delete the group
    await query('DELETE FROM roast_groups WHERE id = $1 AND tenant_id = $2', [id, locals.tenant.id]);

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting group:', err);
    return json({ error: 'Failed to delete group' }, { status: 500 });
  }
};
