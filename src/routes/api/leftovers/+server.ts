import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { Leftover } from '$lib/types';

async function getSnapshotLeftovers(tenantId: string, productionDate: string): Promise<Leftover[]> {
  const summary = await query(
    `SELECT summary FROM production_summaries WHERE tenant_id = $1 AND production_date = $2`,
    [tenantId, productionDate]
  );

  if (summary.rows.length === 0) {
    return [];
  }

  const summaryData = summary.rows[0].summary;

  // If the summary already has leftovers calculated, use them
  if (summaryData.leftovers && typeof summaryData.leftovers === 'object') {
    const leftoversData: Leftover[] = [];
    for (const [group_id, lbs] of Object.entries(summaryData.leftovers)) {
      if (typeof lbs === 'number' && lbs > 0) {
        leftoversData.push({ group_id, lbs, tenant_id: tenantId });
      }
    }
    return leftoversData;
  }

  // Older snapshots without a leftovers map carry nothing usable: the
  // previous fallback read fields the planner never wrote (group.batch_size,
  // overrides keyed by group id) and silently produced NaN.
  return [];
}

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

  // Find the most recent completed production day before the requested date
  const previousDay = await query(
    `SELECT production_date, completed_at
     FROM production_days
     WHERE tenant_id = $1
       AND production_date < $2
       AND status = 'completed'
     ORDER BY production_date DESC
     LIMIT 1`,
    [locals.tenant.id, date]
  );

  // Precedence: the previous completed day's snapshot is the baseline, and
  // manual rows entered after that completion override it per group. With
  // no completed day yet there is no baseline, so the manual rows are the
  // whole answer; returning [] here was why a new tenant's first-day
  // leftovers disappeared on reload.
  if (previousDay.rows.length === 0) {
    const manual = await query<Leftover>(
      'SELECT group_id, lbs, tenant_id FROM leftovers WHERE tenant_id = $1 AND lbs > 0',
      [locals.tenant.id]
    );
    return json(manual.rows);
  }

  const completedAt = previousDay.rows[0]?.completed_at;
  if (completedAt) {
    const manualOverrides = await query<Leftover>(
      `SELECT group_id, lbs, tenant_id FROM leftovers
       WHERE tenant_id = $1 AND updated_at > $2`,
      [locals.tenant.id, completedAt]
    );

    if (manualOverrides.rows.length > 0) {
      // Start with snapshot leftovers, then overlay manual overrides
      const snapshotLeftovers = await getSnapshotLeftovers(locals.tenant.id, previousDay.rows[0].production_date);
      const merged = new Map<string, number>();

      for (const l of snapshotLeftovers) {
        merged.set(l.group_id, l.lbs);
      }
      for (const l of manualOverrides.rows) {
        merged.set(l.group_id, l.lbs);
      }

      const leftoversData: Leftover[] = [];
      for (const [group_id, lbs] of merged) {
        if (lbs > 0) {
          leftoversData.push({ group_id, lbs, tenant_id: locals.tenant.id });
        }
      }
      return json(leftoversData);
    }
  }

  const leftoversData = await getSnapshotLeftovers(locals.tenant.id, previousDay.rows[0].production_date);
  return json(leftoversData);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leftover: Leftover = await request.json();

  const result = await query(
    `INSERT INTO leftovers (group_id, lbs, tenant_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, tenant_id) DO UPDATE SET lbs = $2, updated_at = CURRENT_TIMESTAMP
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
