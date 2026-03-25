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
    // Check if group has products with orders on active or scheduled production days
    const activeOrdersCheck = await query(
      `SELECT COUNT(*) as count FROM orders o
       JOIN production_days pd ON o.production_date = pd.production_date AND o.tenant_id = pd.tenant_id
       WHERE o.product_id IN (SELECT id FROM products WHERE group_id = $1 AND tenant_id = $2)
       AND o.tenant_id = $2 AND pd.status IN ('active', 'scheduled')`,
      [id, locals.tenant.id]
    );

    if (parseInt(activeOrdersCheck.rows[0].count) > 0) {
      return json({
        error: 'Cannot delete group with products in active or scheduled production days. Please remove those products from active days first or mark the group as inactive instead.'
      }, { status: 400 });
    }

    // Cascade delete in order (only safe data):
    // 1. Delete orders from completed production days (safe since they're in snapshots)
    await query(
      `DELETE FROM orders WHERE product_id IN (SELECT id FROM products WHERE group_id = $1 AND tenant_id = $2)
       AND tenant_id = $2 AND production_date IN (
         SELECT production_date FROM production_days WHERE tenant_id = $2 AND status = 'completed'
       )`,
      [id, locals.tenant.id]
    );

    // 2. Delete associated products
    await query('DELETE FROM products WHERE group_id = $1 AND tenant_id = $2', [id, locals.tenant.id]);

    // 3. Delete leftover records for this group
    await query('DELETE FROM leftovers WHERE group_id = $1 AND tenant_id = $2', [id, locals.tenant.id]);

    // 4. Finally delete the group
    await query('DELETE FROM roast_groups WHERE id = $1 AND tenant_id = $2', [id, locals.tenant.id]);

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting group:', err);
    return json({ error: 'Failed to delete group' }, { status: 500 });
  }
};
