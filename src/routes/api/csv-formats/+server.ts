import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { newId } from '$lib/server/ids';
import {
  handle, readBody, requireString, optionalString, optionalId, requireId, optionalBoolean, paramId, ValidationError
} from '$lib/server/validate';
import type { CsvFormat, CsvFormatConfig } from '$lib/types';

function formatConfig(value: unknown): CsvFormatConfig {
  if (!value || typeof value !== 'object') throw new ValidationError('config is required');
  const config = value as Record<string, unknown>;
  const name = config.productNameColumn;
  const nameOk =
    (typeof name === 'string' && name.trim() !== '') ||
    (!!name && typeof name === 'object' && typeof (name as { template?: unknown }).template === 'string');
  if (!nameOk) throw new ValidationError('config.productNameColumn must be a column name or {template}');
  if (typeof config.quantityColumn !== 'string' || config.quantityColumn.trim() === '') {
    throw new ValidationError('config.quantityColumn is required');
  }
  return {
    productNameColumn: name as CsvFormatConfig['productNameColumn'],
    quantityColumn: config.quantityColumn,
    aggregate: config.aggregate === true
  };
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const result = await query<CsvFormat>(
    'SELECT id, name, description, config, active, created_at FROM csv_formats WHERE tenant_id = $1 ORDER BY name',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Create CSV format', async () => {
    const body = await readBody(request);
    const result = await query(
      `INSERT INTO csv_formats (id, name, description, config, active, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, config, active, created_at`,
      [
        optionalId(body) ?? newId('fmt'),
        requireString(body, 'name'),
        optionalString(body, 'description'),
        JSON.stringify(formatConfig(body.config)),
        optionalBoolean(body, 'active', true),
        tenantId
      ]
    );
    return json(result.rows[0], { status: 201 });
  });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Update CSV format', async () => {
    const body = await readBody(request);
    const result = await query(
      `UPDATE csv_formats
       SET name = $2, description = $3, config = $4, active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $6
       RETURNING id, name, description, config, active, created_at`,
      [
        requireId(body),
        requireString(body, 'name'),
        optionalString(body, 'description'),
        JSON.stringify(formatConfig(body.config)),
        optionalBoolean(body, 'active', true),
        tenantId
      ]
    );
    if (!result.rows[0]) return json({ error: 'Format not found' }, { status: 404 });
    return json(result.rows[0]);
  });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Delete CSV format', async () => {
    const id = paramId(url.searchParams.get('id'), 'id');
    const result = await query('DELETE FROM csv_formats WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
    if (result.rows.length === 0) return json({ error: 'Format not found' }, { status: 404 });
    return json({ success: true });
  });
};
