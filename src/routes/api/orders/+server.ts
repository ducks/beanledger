import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { newId } from '$lib/server/ids';
import {
  handle, readBody, requireNumber, requireDate, optionalId, requireId, paramDate, paramId
} from '$lib/server/validate';
import type { Order } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  return handle('List orders', async () => {
    const date = url.searchParams.get('date');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    if (date) {
      const result = await query<Order>(
        'SELECT * FROM orders WHERE production_date = $1 AND tenant_id = $2 ORDER BY created_at DESC',
        [paramDate(date, 'date'), locals.tenant!.id]
      );
      return json(result.rows);
    }
    const conditions = ['tenant_id = $1'];
    const params: unknown[] = [locals.tenant!.id];
    if (dateFrom) {
      params.push(paramDate(dateFrom, 'dateFrom'));
      conditions.push(`production_date >= $${params.length}`);
    }
    if (dateTo) {
      params.push(paramDate(dateTo, 'dateTo'));
      conditions.push(`production_date <= $${params.length}`);
    }
    const result = await query<Order>(
      `SELECT * FROM orders WHERE ${conditions.join(' AND ')} ORDER BY production_date DESC, created_at DESC`,
      params
    );
    return json(result.rows);
  });
};

async function productExists(productId: string, tenantId: string, activeOnly = false): Promise<boolean> {
  const result = await query(`SELECT 1 FROM products p JOIN roast_groups g ON g.id = p.group_id AND g.tenant_id = p.tenant_id WHERE p.id = $1 AND p.tenant_id = $2 AND (NOT $3 OR (p.active AND g.active))`, [productId, tenantId, activeOnly]);
  return result.rows.length > 0;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Create order', async () => {
    const body = await readBody(request);
    const productId = requireId(body, 'product_id');
    if (!(await productExists(productId, tenantId, true))) {
      return json({ error: 'product_id does not name one of your products' }, { status: 400 });
    }
    const result = await query(
      `INSERT INTO orders (id, product_id, qty, production_date, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        optionalId(body) ?? newId('ord'),
        productId,
        requireNumber(body, 'qty', { min: 1, max: 100000, integer: true }),
        requireDate(body, 'production_date'),
        tenantId
      ]
    );
    return json(result.rows[0], { status: 201 });
  });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Update order', async () => {
    const body = await readBody(request);
    const productId = requireId(body, 'product_id');
    if (!(await productExists(productId, tenantId))) {
      return json({ error: 'product_id does not name one of your products' }, { status: 400 });
    }
    const result = await query(
      `UPDATE orders
       SET product_id = $2, qty = $3, production_date = $4
       WHERE id = $1 AND tenant_id = $5
       RETURNING *`,
      [
        requireId(body),
        productId,
        requireNumber(body, 'qty', { min: 1, max: 100000, integer: true }),
        requireDate(body, 'production_date'),
        tenantId
      ]
    );
    if (!result.rows[0]) return json({ error: 'Order not found' }, { status: 404 });
    return json(result.rows[0]);
  });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Delete order', async () => {
    const id = url.searchParams.get('id');
    const date = url.searchParams.get('date');
    if (date) {
      await query('DELETE FROM orders WHERE production_date = $1 AND tenant_id = $2', [paramDate(date, 'date'), tenantId]);
      return json({ success: true });
    }
    if (id) {
      const result = await query('DELETE FROM orders WHERE id = $1 AND tenant_id = $2 RETURNING id', [paramId(id, 'id'), tenantId]);
      if (result.rows.length === 0) return json({ error: 'Order not found' }, { status: 404 });
      return json({ success: true });
    }
    return json({ error: 'Missing id or date' }, { status: 400 });
  });
};
