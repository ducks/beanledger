import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, withTransaction } from '$lib/db';
import { newId, today } from '$lib/server/ids';
import {
  handle, readBody, requireString, requireNumber, optionalId, requireId, optionalBoolean,
  optionalDate, paramId
} from '$lib/server/validate';
import type { Product } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const result = await query<Product>(
    'SELECT * FROM products WHERE tenant_id = $1 ORDER BY created_at DESC',
    [locals.tenant.id]
  );
  return json(result.rows);
};

async function groupExists(groupId: string, tenantId: string): Promise<boolean> {
  const result = await query('SELECT 1 FROM roast_groups WHERE id = $1 AND tenant_id = $2', [groupId, tenantId]);
  return result.rows.length > 0;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Create product', async () => {
    const body = await readBody(request);
    const groupId = requireId(body, 'group_id');
    if (!(await groupExists(groupId, tenantId))) {
      return json({ error: 'group_id does not name one of your roast groups' }, { status: 400 });
    }
    const result = await query(
      `INSERT INTO products (id, name, lbs, group_id, active, created_at, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        optionalId(body) ?? newId('prod'),
        requireString(body, 'name'),
        requireNumber(body, 'lbs', { min: 0.001, max: 1000 }),
        groupId,
        optionalBoolean(body, 'active', true),
        optionalDate(body, 'created_at') ?? today(),
        tenantId
      ]
    );
    return json(result.rows[0], { status: 201 });
  });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Update product', async () => {
    const body = await readBody(request);
    const groupId = requireId(body, 'group_id');
    if (!(await groupExists(groupId, tenantId))) {
      return json({ error: 'group_id does not name one of your roast groups' }, { status: 400 });
    }
    const result = await query(
      `UPDATE products
       SET name = $2, lbs = $3, group_id = $4, active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $6
       RETURNING *`,
      [
        requireId(body),
        requireString(body, 'name'),
        requireNumber(body, 'lbs', { min: 0.001, max: 1000 }),
        groupId,
        optionalBoolean(body, 'active', true),
        tenantId
      ]
    );
    if (!result.rows[0]) return json({ error: 'Product not found' }, { status: 404 });
    return json(result.rows[0]);
  });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Archive product', async () => {
    const id = paramId(url.searchParams.get('id'), 'id');
    const outcome = await withTransaction(async (client) => {
      const exists = await client.query(
        'SELECT 1 FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [id, tenantId]
      );
      if (exists.rows.length === 0) return 'not-found' as const;
      await client.query('UPDATE products SET active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      return 'archived' as const;
    });
    if (outcome === 'not-found') return json({ error: 'Product not found' }, { status: 404 });
    return json({ success: true });
  });
};
