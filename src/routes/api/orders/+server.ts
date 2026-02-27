import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { Order } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = url.searchParams.get('date');

  let result;
  if (date) {
    result = await query<Order>(
      'SELECT * FROM orders WHERE production_date = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [date, locals.tenant.id]
    );
  } else {
    result = await query<Order>(
      'SELECT * FROM orders WHERE tenant_id = $1 ORDER BY created_at DESC',
      [locals.tenant.id]
    );
  }

  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const order: Order = await request.json();

  const result = await query(
    `INSERT INTO orders (id, product_id, qty, production_date, tenant_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [order.id, order.product_id, order.qty, order.production_date, locals.tenant.id]
  );

  return json(result.rows[0], { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const order: Order = await request.json();

  const result = await query(
    `UPDATE orders
     SET product_id = $2, qty = $3, production_date = $4
     WHERE id = $1 AND tenant_id = $5
     RETURNING *`,
    [order.id, order.product_id, order.qty, order.production_date, locals.tenant.id]
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

  await query('DELETE FROM orders WHERE id = $1 AND tenant_id = $2', [id, locals.tenant.id]);
  return json({ success: true });
};
