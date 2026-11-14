import { describe, expect, it } from 'vitest';
import { coffeeWeightReport } from './coffee-weight-report';

const report = (weights: number[], units: 'lbs' | 'kg' = 'lbs') => coffeeWeightReport(
  weights.map((_, i) => ({product_id:String(i), qty:i + 1})),
  weights.map((lbs, i) => ({id:String(i), lbs})), units
);

describe('coffee weight report', () => {
  it('distinguishes the three nominal 10.9oz weights without merging quantities', () => {
    expect(report([.68,.68125,.683433])).toEqual([
      {lbs:.683433, qty:3, size:'10.9 oz (310 g)'},
      {lbs:.68125, qty:2, size:'10.9 oz (309.01 g)'},
      {lbs:.68, qty:1, size:'10.9 oz (308.443 g)'}
    ]);
  });
  it('aggregates identical weights across products and repeated orders', () => {
    expect(coffeeWeightReport([{product_id:'a',qty:4},{product_id:'b',qty:3},{product_id:'a',qty:2}], [{id:'a',lbs:.75},{id:'b',lbs:.75}], 'lbs'))
      .toEqual([{lbs:.75,qty:9,size:'12 oz'}]);
  });
  it('sorts by actual weight across ounces and pounds, not label numbers', () => {
    expect(report([.75, 2, 1]).map(r=>r.size)).toEqual(['2 lb','1 lb','12 oz']);
  });
  it('also distinguishes collisions in metric labels and very close weights', () => {
    const rows = report([.68125,.68125001], 'kg');
    expect(new Set(rows.map(r=>r.size)).size).toBe(2);
    expect(rows.every(r=>r.size.includes('lb stored'))).toBe(true);
    expect(report([.68,.68125], 'kg').map(r=>r.size)).toEqual(['309 g','308.4 g']);
  });
  it('handles empty orders and missing products', () => {
    expect(coffeeWeightReport([{product_id:'missing',qty:4}], [], 'lbs')).toEqual([]);
    expect(report([])).toEqual([]);
  });
});
