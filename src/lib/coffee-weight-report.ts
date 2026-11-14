import { formatPackageSize } from './calc';
import type { Order, Product } from './types';

/** Coffee weights remain distinct; physical bag counts are reported separately.
 * Add precision only when the usual display would hide a difference.
 */
export function coffeeWeightReport(
  orders: Pick<Order, 'product_id' | 'qty'>[],
  products: Pick<Product, 'id' | 'lbs'>[],
  units: 'lbs' | 'kg'
) {
  const weights = new Map(products.map(p => [p.id, p.lbs]));
  const counts = new Map<number, number>();
  for (const order of orders) {
    const lbs = weights.get(order.product_id);
    if (lbs === undefined) continue;
    counts.set(lbs, (counts.get(lbs) ?? 0) + order.qty);
  }
  const rows = [...counts].sort(([a], [b]) => b - a).map(([lbs, qty]) => ({
    lbs, qty, size: formatPackageSize(lbs, units)
  }));
  const labelCounts = new Map<string, number>();
  for (const row of rows) labelCounts.set(row.size, (labelCounts.get(row.size) ?? 0) + 1);
  for (const row of rows) {
    if (labelCounts.get(row.size)! > 1) {
      const grams = Number((row.lbs * 453.59237).toFixed(3));
      row.size += ` (${grams} g)`;
    }
  }
  // Even sub-milligram differences must not produce indistinguishable cards.
  const preciseCounts = new Map<string, number>();
  for (const row of rows) preciseCounts.set(row.size, (preciseCounts.get(row.size) ?? 0) + 1);
  for (const row of rows) {
    if (preciseCounts.get(row.size)! > 1) row.size += ` · ${row.lbs} lb stored`;
  }
  return rows;
}
