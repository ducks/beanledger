import { json } from '@sveltejs/kit';
import { query } from '$lib/db';
import type { Product } from '$lib/types';

export async function GET() {
  const result = await query<Product>('SELECT * FROM products ORDER BY created_at DESC');
  return json(result.rows);
}

export async function POST({ request }) {
  const product: Product = await request.json();

  const result = await query(
    `INSERT INTO products (id, name, lbs, group_id, active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [product.id, product.name, product.lbs, product.group_id, product.active, product.created_at]
  );

  return json(result.rows[0], { status: 201 });
}

export async function PUT({ request }) {
  const product: Product = await request.json();

  const result = await query(
    `UPDATE products
     SET name = $2, lbs = $3, group_id = $4, active = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [product.id, product.name, product.lbs, product.group_id, product.active]
  );

  return json(result.rows[0]);
}

export async function DELETE({ url }) {
  const id = url.searchParams.get('id');
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }

  await query('DELETE FROM products WHERE id = $1', [id]);
  return json({ success: true });
}
