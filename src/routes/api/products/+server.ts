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

  await query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [id, locals.tenant.id]);
  return json({ success: true });
};
