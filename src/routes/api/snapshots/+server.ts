import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { handle, paramDate } from '$lib/server/validate';

/**
 * Snapshots are written by the server when a roast day is completed
 * (see $lib/server/snapshot) and are read-only here.
 *
 * GET /api/snapshots            every snapshot, newest first
 * GET /api/snapshots?date=      one day's snapshot, or null
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('List snapshots', async () => {
    const date = url.searchParams.get('date');
    if (date) {
      const result = await query(
        'SELECT * FROM production_summaries WHERE production_date = $1 AND tenant_id = $2',
        [paramDate(date, 'date'), tenantId]
      );
      return json(result.rows[0] ?? null);
    }
    const result = await query(
      'SELECT * FROM production_summaries WHERE tenant_id = $1 ORDER BY production_date DESC',
      [tenantId]
    );
    return json(result.rows);
  });
};
