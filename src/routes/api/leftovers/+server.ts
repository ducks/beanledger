import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, getDb } from '$lib/db';
import { effectiveLeftovers } from '$lib/server/leftovers';
import { handle, readBody, requireId, requireNumber, paramDate } from '$lib/server/validate';
import type { Leftover } from '$lib/types';

/**
 * GET /api/leftovers            current manual rows
 * GET /api/leftovers?date=      leftovers in effect at the start of that day
 *                               (previous completed snapshot overlaid with
 *                               manual rows entered since; see
 *                               $lib/server/leftovers)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('List leftovers', async () => {
    const date = url.searchParams.get('date');
    if (!date) {
      const result = await query<Leftover>('SELECT * FROM leftovers WHERE tenant_id = $1', [tenantId]);
      return json(result.rows);
    }
    const rows = await effectiveLeftovers(getDb(), tenantId, paramDate(date, 'date'));
    return json(rows.filter((row) => row.lbs > 0));
  });
};

async function upsert(request: Request, tenantId: string): Promise<Response> {
  const body = await readBody(request);
  const groupId = requireId(body, 'group_id');
  const exists = await query('SELECT 1 FROM roast_groups WHERE id = $1 AND tenant_id = $2', [groupId, tenantId]);
  if (exists.rows.length === 0) {
    return json({ error: 'group_id does not name one of your roast groups' }, { status: 400 });
  }
  const result = await query(
    `INSERT INTO leftovers (group_id, lbs, tenant_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, tenant_id) DO UPDATE SET lbs = EXCLUDED.lbs, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [groupId, requireNumber(body, 'lbs', { min: 0, max: 100000 }), tenantId]
  );
  return json(result.rows[0]);
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Save leftover', () => upsert(request, tenantId));
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Save leftover', () => upsert(request, tenantId));
};
