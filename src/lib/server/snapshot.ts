import type pg from 'pg';
import { calcGroup } from '$lib/calc';
import type { BatchOverride, Order, Product, RoastGroup } from '$lib/types';
import { effectiveLeftovers } from './leftovers';
import { newId } from './ids';

/**
 * Record what a completed roast day looked like, computed from the database
 * rather than from whatever the browser had in memory. Stored once per day
 * and never rewritten by the planner; the next day's leftovers read from it.
 */
export async function writeCompletionSnapshot(
  client: pg.PoolClient,
  tenantId: string,
  productionDate: string
): Promise<Record<string, number>> {
  const [groups, products, orders, overrides, leftovers] = await Promise.all([
    client.query<RoastGroup>('SELECT * FROM roast_groups WHERE tenant_id = $1', [tenantId]),
    client.query<Product>('SELECT * FROM products WHERE tenant_id = $1', [tenantId]),
    client.query<Order>(
      'SELECT * FROM orders WHERE tenant_id = $1 AND production_date = $2',
      [tenantId, productionDate]
    ),
    client.query<BatchOverride>('SELECT * FROM batch_overrides WHERE tenant_id = $1', [tenantId]),
    effectiveLeftovers(client, tenantId, productionDate)
  ]);

  const overrideMap: Record<string, number> = {};
  for (const row of overrides.rows) overrideMap[row.batch_type] = Number(row.weight_lbs);
  const leftoverIn: Record<string, number> = {};
  for (const row of leftovers) leftoverIn[row.group_id] = row.lbs;

  // A manual entry for the day, including an explicit zero, is what the
  // roaster confirmed on the finish dialog. Otherwise carry the predicted
  // leftover from the roast.
  const manual = await client.query<{ group_id: string; lbs: number }>(
    'SELECT group_id, lbs FROM leftovers WHERE tenant_id = $1',
    [tenantId]
  );
  const manualMap = new Map(manual.rows.map((row) => [row.group_id, Number(row.lbs)]));

  const finalLeftovers: Record<string, number> = {};
  for (const group of groups.rows) {
    const calc = calcGroup(group, orders.rows, products.rows, leftoverIn[group.id] ?? 0, overrideMap);
    const entered = manualMap.get(group.id);
    if (entered !== undefined) {
      finalLeftovers[group.id] = entered;
    } else if (calc.predictedLeftover > 0) {
      finalLeftovers[group.id] = calc.predictedLeftover;
    }
  }

  const productById = new Map(products.rows.map((p) => [p.id, p]));
  const summary = {
    orders: orders.rows
      .map((o) => {
        const product = productById.get(o.product_id);
        return product ? { product_name: product.name, qty: o.qty } : null;
      })
      .filter(Boolean),
    leftovers: finalLeftovers,
    groups: groups.rows,
    products: products.rows,
    batchOverrides: overrideMap,
    computed_at: new Date().toISOString()
  };

  await client.query(
    `INSERT INTO production_summaries (id, production_date, summary, tenant_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (production_date, tenant_id)
     DO UPDATE SET id = EXCLUDED.id, summary = EXCLUDED.summary, saved_at = CURRENT_TIMESTAMP`,
    [newId('snap'), productionDate, JSON.stringify(summary), tenantId]
  );

  return finalLeftovers;
}
