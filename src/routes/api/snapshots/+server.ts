import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';

interface ProductionSnapshot {
  id: string;
  production_date: string;
  summary: {
    orders: Array<{ product_name: string; qty: number }>;
    leftovers: Record<string, number>;
    notes?: string;
  };
  saved_at: string;
  tenant_id: string;
}

/**
 * GET /api/snapshots
 * Fetch all production snapshots for tenant
 * Optional: ?date=YYYY-MM-DD to fetch specific date
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = url.searchParams.get('date');

  let result;
  if (date) {
    result = await query<ProductionSnapshot>(
      'SELECT * FROM production_summaries WHERE production_date = $1 AND tenant_id = $2',
      [date, locals.tenant.id]
    );
    return json(result.rows[0] || null);
  } else {
    result = await query<ProductionSnapshot>(
      'SELECT * FROM production_summaries WHERE tenant_id = $1 ORDER BY production_date DESC',
      [locals.tenant.id]
    );
    return json(result.rows);
  }
};

/**
 * POST /api/snapshots
 * Save or update a production snapshot
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { production_date, orders, leftovers, notes } = await request.json();

  if (!production_date) {
    return json({ error: 'production_date is required' }, { status: 400 });
  }

  const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const summary = { orders, leftovers, notes };

  // Upsert: delete existing snapshot for this date, then insert new one
  await query(
    'DELETE FROM production_summaries WHERE production_date = $1 AND tenant_id = $2',
    [production_date, locals.tenant.id]
  );

  const result = await query<ProductionSnapshot>(
    `INSERT INTO production_summaries (id, production_date, summary, tenant_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [snapshotId, production_date, JSON.stringify(summary), locals.tenant.id]
  );

  return json(result.rows[0], { status: 201 });
};

/**
 * DELETE /api/snapshots?date=YYYY-MM-DD
 * Delete a production snapshot
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = url.searchParams.get('date');
  if (!date) {
    return json({ error: 'Missing date parameter' }, { status: 400 });
  }

  await query(
    'DELETE FROM production_summaries WHERE production_date = $1 AND tenant_id = $2',
    [date, locals.tenant.id]
  );

  return json({ success: true });
};
