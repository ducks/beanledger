import { json } from '@sveltejs/kit';
import { query } from '$lib/db';
import type { Order } from '$lib/types';

export async function GET({ url }) {
  const date = url.searchParams.get('date');

  let result;
  if (date) {
    result = await query<Order>(
      'SELECT * FROM orders WHERE production_date = $1 ORDER BY created_at DESC',
      [date]
    );
  } else {
    result = await query<Order>('SELECT * FROM orders ORDER BY created_at DESC');
  }

  return json(result.rows);
}

export async function POST({ request }) {
  const order: Order = await request.json();

  const result = await query(
    `INSERT INTO orders (id, product_id, qty, production_date)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [order.id, order.product_id, order.qty, order.production_date]
  );

  return json(result.rows[0], { status: 201 });
}

export async function PUT({ request }) {
  const order: Order = await request.json();

  const result = await query(
    `UPDATE orders
     SET product_id = $2, qty = $3, production_date = $4
     WHERE id = $1
     RETURNING *`,
    [order.id, order.product_id, order.qty, order.production_date]
  );

  return json(result.rows[0]);
}

export async function DELETE({ url }) {
  const id = url.searchParams.get('id');
  if (!id) {
    return json({ error: 'Missing id' }, { status: 400 });
  }

  await query('DELETE FROM orders WHERE id = $1', [id]);
  return json({ success: true });
}
