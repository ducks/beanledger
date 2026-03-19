import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';

/**
 * GET /api/imports?date=YYYY-MM-DD
 * List all CSV imports for a specific date
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = url.searchParams.get('date');
  if (!date) {
    return json({ error: 'date parameter required' }, { status: 400 });
  }

  const result = await query(
    `SELECT id, filename, production_date, imported_at, order_count
     FROM imports
     WHERE tenant_id = $1 AND production_date = $2
     ORDER BY imported_at DESC`,
    [locals.tenant.id, date]
  );

  return json({ imports: result.rows });
};

/**
 * DELETE /api/imports?id=import-xxx
 * Delete a specific import batch and all its orders
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const importId = url.searchParams.get('id');
  if (!importId) {
    return json({ error: 'id parameter required' }, { status: 400 });
  }

  // Verify the import belongs to this tenant
  const importResult = await query(
    'SELECT id FROM imports WHERE id = $1 AND tenant_id = $2',
    [importId, locals.tenant.id]
  );

  if (importResult.rows.length === 0) {
    return json({ error: 'Import not found' }, { status: 404 });
  }

  // Delete all orders from this import batch
  await query(
    'DELETE FROM orders WHERE import_batch_id = $1 AND tenant_id = $2',
    [importId, locals.tenant.id]
  );

  // Delete the import record
  await query(
    'DELETE FROM imports WHERE id = $1 AND tenant_id = $2',
    [importId, locals.tenant.id]
  );

  return json({ success: true });
};
