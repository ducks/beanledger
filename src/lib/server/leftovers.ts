import type pg from 'pg';
import type { Leftover } from '$lib/types';

type Queryable = Pick<pg.PoolClient, 'query'>;

interface CompletedDay {
  production_date: string;
  completed_at: string;
}

/**
 * The leftovers in effect at the start of `productionDate` for a tenant.
 *
 * Precedence: the most recent completed day before the date provides the
 * baseline from its snapshot; manual rows updated after that completion
 * override it per group. With no completed day yet, the manual rows are
 * the whole answer. Rows at zero are included so a deliberate "nothing
 * left" survives; callers that only want positive amounts filter.
 */
export async function effectiveLeftovers(
  db: Queryable,
  tenantId: string,
  productionDate: string
): Promise<Leftover[]> {
  const previous = await db.query<CompletedDay>(
    `SELECT production_date::text, completed_at
     FROM production_days
     WHERE tenant_id = $1 AND production_date < $2 AND status = 'completed'
     ORDER BY production_date DESC
     LIMIT 1`,
    [tenantId, productionDate]
  );

  if (previous.rows.length === 0) {
    const manual = await db.query<Leftover>(
      'SELECT group_id, lbs, tenant_id FROM leftovers WHERE tenant_id = $1',
      [tenantId]
    );
    return manual.rows.map((row) => ({ ...row, lbs: Number(row.lbs) }));
  }

  const baseline = new Map<string, number>();
  const snapshot = await db.query<{ summary: { leftovers?: Record<string, unknown> } }>(
    'SELECT summary FROM production_summaries WHERE tenant_id = $1 AND production_date = $2',
    [tenantId, previous.rows[0].production_date]
  );
  const stored = snapshot.rows[0]?.summary?.leftovers;
  if (stored && typeof stored === 'object') {
    for (const [groupId, lbs] of Object.entries(stored)) {
      if (typeof lbs === 'number' && Number.isFinite(lbs)) baseline.set(groupId, lbs);
    }
  }

  const overrides = await db.query<Leftover>(
    `SELECT group_id, lbs, tenant_id FROM leftovers
     WHERE tenant_id = $1 AND updated_at > $2`,
    [tenantId, previous.rows[0].completed_at]
  );
  for (const row of overrides.rows) {
    baseline.set(row.group_id, Number(row.lbs));
  }

  return Array.from(baseline, ([group_id, lbs]) => ({ group_id, lbs, tenant_id: tenantId }));
}
