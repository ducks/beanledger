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
    group_id: string;
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

const LB_PER_KG = 1 / 0.453592; // ~2.20462

/**
 * Format a weight stored in lbs for display in the user's preferred units.
 * The unit suffix is included; pass `false` to omit.
 */
export function formatWeight(
  lbs: number,
  units: 'lbs' | 'kg',
  decimals = 2,
  withUnit = true
): string {
  const value = units === 'kg' ? lbs * 0.453592 : lbs;
  const num = value.toFixed(decimals);
  if (!withUnit) return num;
  return `${num} ${units === 'kg' ? 'kg' : 'lb'}`;
}

function compact(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

const GRAMS_PER_LB = 453.59237;

/**
 * Format the capacity of one retail package. Small imperial packages are
 * conventionally labeled in ounces, while small metric packages use grams.
 * Larger values stay in the user's preferred roast-weight unit.
 */
export function formatPackageSize(lbs: number, units: 'lbs' | 'kg'): string {
  return formatPackageSizeGrams(lbs * GRAMS_PER_LB, units);
}

/** Format a normalized packaging capacity stored as whole grams. */
export function formatPackageSizeGrams(grams: number, units: 'lbs' | 'kg'): string {
  if (units === 'kg') {
    const kilograms = grams / 1000;
    return kilograms < 1
      ? `${compact(grams, 1)} g`
      : `${compact(kilograms, 2)} kg`;
  }

  const pounds = grams / GRAMS_PER_LB;
  return pounds < 1
    ? `${compact(pounds * 16, 1)} oz`
    : `${compact(pounds, 2)} lb`;
}

/**
 * Parse a number entered in the user's preferred units back to canonical lbs.
 * Accepts a number or numeric string. Returns NaN if input is empty/invalid.
 */
export function parseWeight(input: number | string, units: 'lbs' | 'kg'): number {
  const n = typeof input === 'number' ? input : parseFloat(input);
  if (!isFinite(n)) return NaN;
  return units === 'kg' ? n / 0.453592 : n;
}

/**
 * Convert lbs into the user's preferred units (numeric, no formatting).
 */
export function toUnits(lbs: number, units: 'lbs' | 'kg'): number {
  return units === 'kg' ? lbs * 0.453592 : lbs;
}

/**
 * The display label for the user's preferred unit (used as input suffix).
 */
export function unitLabel(units: 'lbs' | 'kg'): string {
  return units === 'kg' ? 'kg' : 'lb';
}

export { LB_PER_KG };
