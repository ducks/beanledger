import type { RoastGroup, Product, Order } from './types';

export interface GroupCalc {
  totalLbs: number;
  needed: number;
  neededRoasted: number;
  batches: number;
  batchesUp: number;
  batchWeight: number;
  roastFactor: number;
  roastLossPct: number;
  predictedLeftover: number;
  items: Array<{
    id: string;
    name: string;
    lbs: number;
    group: string;
    totalQty: number;
    totalLbs: number;
  }>;
}

export function calcGroup(
  group: RoastGroup,
  orders: Order[],
  products: Product[],
  leftover: number,
  batchOverrides: Record<string, number> = {}
): GroupCalc {
  // Use batch override weight if available, otherwise default to 20
  const batchWeight = batchOverrides[group.batch_type] ?? 20;
  const roastLossPct = group.roast_loss_pct ?? 0;
  const roastFactor = Math.max(0.001, 1 - roastLossPct / 100);

  const items = products
    .filter((p) => p.group_id === group.id)
    .map((p) => {
      const totalQty = orders
        .filter((o) => o.product_id === p.id)
        .reduce((s, o) => s + o.qty, 0);
      return { ...p, totalQty, totalLbs: totalQty * p.lbs };
    })
    .filter((p) => p.totalQty > 0);

  const totalLbs = items.reduce((s, i) => s + i.totalLbs, 0);
  const neededRoasted = Math.max(0, totalLbs - leftover);
  const neededGreen = roastLossPct > 0 ? neededRoasted / roastFactor : neededRoasted;
  const batches = trunc4(neededGreen / batchWeight);
  const batchesUp = Math.ceil(batches);

  // Calculate predicted leftover: roasted output from batches - amount needed
  const roastedOutput = batchesUp * batchWeight * roastFactor;
  const predictedLeftover = Math.max(0, roastedOutput - neededRoasted);

  return {
    totalLbs,
    needed: neededGreen,
    neededRoasted,
    batches,
    batchesUp,
    batchWeight,
    roastFactor,
    roastLossPct,
    predictedLeftover,
    items
  };
}

function trunc4(n: number): number {
  return Math.trunc(n * 10000) / 10000;
}

export function formatWeight(lbs: number, units: 'lbs' | 'kg', decimals = 2): string {
  if (units === 'kg') {
    const kg = lbs * 0.453592;
    return `${kg.toFixed(decimals)} kg`;
  }
  return `${lbs.toFixed(decimals)} lb`;
}
