import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { CsvFormat } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<CsvFormat>(
    'SELECT id, name, description, config, active, created_at FROM csv_formats WHERE tenant_id = $1 ORDER BY name',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const format: CsvFormat = await request.json();

  if (!format.name || !format.config?.productNameColumn || !format.config?.quantityColumn) {
    return json(
      { error: 'name, config.productNameColumn, and config.quantityColumn are required' },
      { status: 400 }
    );
  }

  const result = await query(
    `INSERT INTO csv_formats (id, name, description, config, active, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, config, active, created_at`,
    [
      format.id,
      format.name,
      format.description ?? null,
      JSON.stringify(format.config),
      format.active ?? true,
      locals.tenant.id
    ]
  );

  return json(result.rows[0], { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const format: CsvFormat = await request.json();

  const result = await query(
    `UPDATE csv_formats
     SET name = $2, description = $3, config = $4, active = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $6
     RETURNING id, name, description, config, active, created_at`,
    [
      format.id,
      format.name,
      format.description ?? null,
      JSON.stringify(format.config),
      format.active,
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

  await query('DELETE FROM csv_formats WHERE id = $1 AND tenant_id = $2', [
    id,
    locals.tenant.id
  ]);
  return json({ success: true });
};
