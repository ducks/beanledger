import type { Product } from './types';

export interface BundleComponent {
  product_id: string;
  quantity: number;
  name: string;
  lbs: number;
  group_id: string;
}
export interface BundleRevision {
  id: string;
  bundle_id: string;
  cycle_start: string | null;
  components: BundleComponent[];
  created_at: string;
  imported_lines: number;
}
export interface Bundle {
  id: string;
  name: string;
  contents_mode: 'fixed' | 'rotating';
  quantity_mode: 'bags' | 'packs';
  active: boolean;
  revisions: BundleRevision[];
  imported_usage?: { product_id:string; name:string; bag_count:number; last_production_date:string }[];
}
export interface BundleSnapshot {
  bundle_id: string;
  name: string;
  revision_id: string;
  cycle_start: string | null;
  quantity_mode: 'bags' | 'packs';
  source_name: string;
  source_record: number;
  source_quantity: number;
  components: BundleComponent[];
}
export const bundleNameKey = (name: string) => name.trim().toLowerCase();

/** Calendar cycles, deliberately independent of local UTC-offset conversions. */
export function cycleStart(date: string): string {
  return date.slice(0, 8) + (Number(date.slice(8, 10)) < 15 ? '01' : '15');
}
export function nextCycle(date: string): string {
  const current = cycleStart(date);
  if (current.endsWith('01')) return current.slice(0, 8) + '15';
  const year = Number(current.slice(0, 4));
  const month = Number(current.slice(5, 7));
  return `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`;
}
export function cycleLabel(start: string): string {
  const next = new Date(nextCycle(start) + 'T00:00:00Z');
  next.setUTCDate(next.getUTCDate() - 1);
  return `${start} – ${next.toISOString().slice(0, 10)}`;
}
export function revisionFor(bundle: Bundle, date: string): BundleRevision | undefined {
  const cycle = bundle.contents_mode === 'fixed' ? null : cycleStart(date);
  return bundle.revisions.find(r => r.cycle_start === cycle);
}

export function expandBundle(bundle: Bundle, revision: BundleRevision, quantity: number, products: Product[]): BundleComponent[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error('Quantity must be a whole number from 1 to 100000.');
  if (!revision.components.length) throw new Error('Set the bundle contents before importing.');
  if (bundle.quantity_mode === 'bags' && quantity > revision.components.length) {
    throw new Error(`${quantity} bags requested, but this lineup only has ${revision.components.length} slots.`);
  }
  // Require the entire configured lineup to remain usable, even for smaller orders.
  const resolved = revision.components.map(c => {
    const product = products.find(p => p.id === c.product_id && p.active);
    if (!product) throw new Error(`“${c.name}” is unavailable. Update the bundle contents.`);
    return { product_id: product.id, name: product.name, lbs: product.lbs, group_id: product.group_id, quantity: c.quantity };
  });
  return bundle.quantity_mode === 'bags'
    ? resolved.slice(0, quantity).map(c => ({ ...c, quantity: 1 }))
    : resolved.map(c => {
      const expanded = c.quantity * quantity;
      if (!Number.isSafeInteger(expanded) || expanded > 100000) throw new Error('Expanded component quantity exceeds 100000.');
      return { ...c, quantity: expanded };
    });
}
