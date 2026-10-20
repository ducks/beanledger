import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { newId } from '$lib/server/ids';
import { handle, readBody, requireString, optionalId, requireId, optionalBoolean, paramId } from '$lib/server/validate';
import type { ImportAlias } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const result = await query<ImportAlias>(
    'SELECT * FROM import_aliases WHERE tenant_id = $1 ORDER BY alias_name',
    [locals.tenant.id]
  );
  return json(result.rows);
};

async function productExists(productId: string, tenantId: string): Promise<boolean> {
  const result = await query('SELECT 1 FROM products WHERE id = $1 AND tenant_id = $2', [productId, tenantId]);
  return result.rows.length > 0;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Create alias', async () => {
    const body = await readBody(request);
    const productId = requireId(body, 'product_id');
    if (!(await productExists(productId, tenantId))) {
      return json({ error: 'product_id does not name one of your products' }, { status: 400 });
    }
    const result = await query(
      `INSERT INTO import_aliases (id, alias_name, product_id, active, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [optionalId(body) ?? newId('alias'), requireString(body, 'alias_name'), productId, optionalBoolean(body, 'active', true), tenantId]
    );
    return json(result.rows[0], { status: 201 });
  });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Update alias', async () => {
    const body = await readBody(request);
    const productId = requireId(body, 'product_id');
    if (!(await productExists(productId, tenantId))) {
      return json({ error: 'product_id does not name one of your products' }, { status: 400 });
    }
    const result = await query(
      `UPDATE import_aliases
       SET alias_name = $2, product_id = $3, active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $5
       RETURNING *`,
      [requireId(body), requireString(body, 'alias_name'), productId, optionalBoolean(body, 'active', true), tenantId]
    );
    if (!result.rows[0]) return json({ error: 'Alias not found' }, { status: 404 });
    return json(result.rows[0]);
  });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Delete alias', async () => {
    const id = paramId(url.searchParams.get('id'), 'id');
    const result = await query('DELETE FROM import_aliases WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
    if (result.rows.length === 0) return json({ error: 'Alias not found' }, { status: 404 });
    return json({ success: true });
  });
};
