import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { ImportAlias } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<ImportAlias>(
    'SELECT * FROM import_aliases WHERE tenant_id = $1 ORDER BY alias_name',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alias: ImportAlias = await request.json();

  const result = await query(
    `INSERT INTO import_aliases (id, alias_name, product_id, active, tenant_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [alias.id, alias.alias_name, alias.product_id, alias.active ?? true, locals.tenant.id]
  );

  return json(result.rows[0], { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alias: ImportAlias = await request.json();

  const result = await query(
    `UPDATE import_aliases
     SET alias_name = $2, product_id = $3, active = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $5
     RETURNING *`,
    [alias.id, alias.alias_name, alias.product_id, alias.active, locals.tenant.id]
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

  await query('DELETE FROM import_aliases WHERE id = $1 AND tenant_id = $2', [id, locals.tenant.id]);
  return json({ success: true });
};
