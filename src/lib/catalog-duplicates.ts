import type { Product } from './types';

export function normalizedCatalogName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function duplicateProductNames(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const key = normalizedCatalogName(product.name);
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  return [...groups.values()].filter(group => group.length > 1);
}

/** These are size-review candidates, never assertions that coffees duplicate. */
export function nearbyProductWeights(products: Product[], toleranceGrams = 2) {
  const sizes = new Map<number, Product[]>();
  for (const product of products) {
    if (product.lbs <= 0) continue;
    sizes.set(product.lbs, [...(sizes.get(product.lbs) ?? []), product]);
  }
  const weights = [...sizes.keys()].sort((a,b) => a-b);
  const pairs = [];
  for (let i=0;i<weights.length;i++) {
    for (let j=i+1;j<weights.length;j++) {
      const difference = (weights[j]-weights[i])*453.59237;
      if (difference > toleranceGrams) break;
      pairs.push({lower:weights[i], upper:weights[j], difference, products:[...sizes.get(weights[i])!,...sizes.get(weights[j])!]});
    }
  }
  return pairs;
}
