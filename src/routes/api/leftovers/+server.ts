import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { Leftover } from '$lib/types';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = url.searchParams.get('date');

  // If no date provided, return current leftovers
  if (!date) {
    const result = await query<Leftover>(
      'SELECT * FROM leftovers WHERE tenant_id = $1',
      [locals.tenant.id]
    );
    return json(result.rows);
  }

  console.log('[LEFTOVERS API] Requested date:', date);

  // Find the most recent completed production day before the requested date
  const previousDay = await query(
    `SELECT production_date
     FROM production_days
     WHERE tenant_id = $1
       AND production_date < $2
       AND status = 'completed'
     ORDER BY production_date DESC
     LIMIT 1`,
    [locals.tenant.id, date]
  );

  console.log('[LEFTOVERS API] Previous completed day:', previousDay.rows);

  // If no previous day, return empty leftovers
  if (previousDay.rows.length === 0) {
    console.log('[LEFTOVERS API] No previous completed day found');
    return json([]);
  }

  // Load the summary for that day
  const summary = await query(
    `SELECT summary FROM production_summaries WHERE tenant_id = $1 AND production_date = $2`,
    [locals.tenant.id, previousDay.rows[0].production_date]
  );

  if (summary.rows.length === 0) {
    // No summary, return empty leftovers
    return json([]);
  }

  const summaryData = summary.rows[0].summary;
  console.log('[LEFTOVERS API] Summary data:', JSON.stringify(summaryData, null, 2));

  // If the summary already has leftovers calculated, use them
  if (summaryData.leftovers && typeof summaryData.leftovers === 'object') {
    console.log('[LEFTOVERS API] Using pre-calculated leftovers from summary');
    const leftoversData: Leftover[] = [];
    for (const [group_id, lbs] of Object.entries(summaryData.leftovers)) {
      if (typeof lbs === 'number' && lbs > 0) {
        leftoversData.push({
          group_id,
          lbs,
          tenant_id: locals.tenant.id
        });
      }
    }
    return json(leftoversData);
  }

  // If summary has complete data, calculate leftovers
  if (summaryData.groups && summaryData.products && summaryData.orders) {
    const { groups, products, orders, batchOverrides = {} } = summaryData;
    const leftoversData: Leftover[] = [];

    for (const group of groups) {
      const groupProducts = products.filter((p: any) => p.group_id === group.id);
      const totalNeeded = groupProducts.reduce((sum: number, p: any) => {
        const productOrders = orders.filter((o: any) => o.product_name === p.name);
        const needed = productOrders.reduce((s: number, o: any) => s + (p.lbs * o.qty), 0);
        return sum + needed;
      }, 0);

      const batchSize = batchOverrides[group.id] || group.batch_size;
      const batches = Math.ceil(totalNeeded / batchSize);
      const totalRoasted = batches * batchSize;
      const leftover = totalRoasted - totalNeeded;

      if (leftover > 0) {
        leftoversData.push({
          group_id: group.id,
          lbs: leftover,
          tenant_id: locals.tenant.id
        });
      }
    }
    return json(leftoversData);
  }

  // Fallback: return empty
  return json([]);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leftover: Leftover = await request.json();

  const result = await query(
    `INSERT INTO leftovers (group_id, lbs, tenant_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id) DO UPDATE SET lbs = $2, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [leftover.group_id, leftover.lbs, locals.tenant.id]
  );

  return json(result.rows[0]);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leftover: Leftover = await request.json();

  const result = await query(
    `UPDATE leftovers
     SET lbs = $2, updated_at = CURRENT_TIMESTAMP
     WHERE group_id = $1 AND tenant_id = $3
     RETURNING *`,
    [leftover.group_id, leftover.lbs, locals.tenant.id]
  );

  return json(result.rows[0]);
};
