import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { Product } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<Product>(
    'SELECT * FROM products WHERE tenant_id = $1 ORDER BY created_at DESC',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const product: Product = await request.json();

  const result = await query(
    `INSERT INTO products (id, name, lbs, group_id, active, created_at, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [product.id, product.name, product.lbs, product.group_id, product.active, product.created_at, locals.tenant.id]
  );

  return json(result.rows[0], { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const product: Product = await request.json();

  const result = await query(
    `UPDATE products
     SET name = $2, lbs = $3, group_id = $4, active = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $6
     RETURNING *`,
    [product.id, product.name, product.lbs, product.group_id, product.active, locals.tenant.id]
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
    // Check if product has orders on active or scheduled production days
    const activeOrdersCheck = await query(
      `SELECT COUNT(*) as count FROM orders o
       JOIN production_days pd ON o.production_date = pd.production_date AND o.tenant_id = pd.tenant_id
       WHERE o.product_id = $1 AND o.tenant_id = $2 AND pd.status IN ('active', 'scheduled')`,
      [id, locals.tenant.id]
    );

    if (parseInt(activeOrdersCheck.rows[0].count) > 0) {
      return json({
        error: 'Cannot delete product with orders on active or scheduled production days. Please remove from those days first or mark as inactive instead.'
      }, { status: 400 });
    }

    // Only delete orders from completed production days (safe since they're in snapshots)
    await query(
      `DELETE FROM orders WHERE product_id = $1 AND tenant_id = $2
       AND production_date IN (
         SELECT production_date FROM production_days
         WHERE tenant_id = $2 AND status = 'completed'
       )`,
      [id, locals.tenant.id]
    );

    // Then delete the product
    await query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [id, locals.tenant.id]);

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    return json({ error: 'Failed to delete product' }, { status: 500 });
  }
};
