import { describe, it, expect } from 'vitest';
import { calcGroup, formatWeight } from './calc';
import type { RoastGroup, Product, Order } from './types';

describe('formatWeight', () => {
  it('formats pounds with default 2 decimals', () => {
    expect(formatWeight(10.5, 'lbs')).toBe('10.50 lb');
    expect(formatWeight(0.625, 'lbs')).toBe('0.63 lb');
  });

  it('formats kilograms with conversion', () => {
    expect(formatWeight(10, 'kg')).toBe('4.54 kg');
    expect(formatWeight(22.0462, 'kg')).toBe('10.00 kg'); // 22.0462 lbs = 10 kg
  });

  it('respects custom decimal places', () => {
    expect(formatWeight(10.5678, 'lbs', 4)).toBe('10.5678 lb');
    expect(formatWeight(10.5678, 'kg', 4)).toBe('4.7935 kg');
  });
});

describe('calcGroup', () => {
  const mockGroup: RoastGroup = {
    id: 'test-group',
    label: 'Test Group',
    tag: 'TG',
    batch_type: 'standard',
    roast_loss_pct: 15,
    type: 'single_origin',
    components: [],
    active: true,
    created_at: '2026-01-01'
  };

  const mockProducts: Product[] = [
    { id: 'p1', name: 'Product 1', lbs: 1.0, group_id: 'test-group', active: true, created_at: '2026-01-01' },
    { id: 'p2', name: 'Product 2', lbs: 0.625, group_id: 'test-group', active: true, created_at: '2026-01-01' },
    { id: 'p3', name: 'Product 3', lbs: 0.5, group_id: 'other-group', active: true, created_at: '2026-01-01' }
  ];

  it('calculates total pounds from orders', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 10, production_date: '2026-03-01' },
      { id: 'o2', product_id: 'p2', qty: 8, production_date: '2026-03-01' }
    ];

    const result = calcGroup(mockGroup, orders, mockProducts, 0);

    // 10 * 1.0 + 8 * 0.625 = 10 + 5 = 15 lbs
    expect(result.totalLbs).toBe(15);
    expect(result.items).toHaveLength(2);
  });

  it('filters out products from other groups', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 10, production_date: '2026-03-01' },
      { id: 'o2', product_id: 'p3', qty: 5, production_date: '2026-03-01' } // Different group
    ];

    const result = calcGroup(mockGroup, orders, mockProducts, 0);

    // Should only include p1 (10 lbs), not p3
    expect(result.totalLbs).toBe(10);
    expect(result.items).toHaveLength(1);
  });

  it('subtracts leftovers from needed roasted coffee', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 20, production_date: '2026-03-01' }
    ];

    const result = calcGroup(mockGroup, orders, mockProducts, 5);

    // 20 lbs total, 5 lbs leftover = 15 lbs needed roasted
    expect(result.totalLbs).toBe(20);
    expect(result.neededRoasted).toBe(15);
  });

  it('calculates green coffee needed with roast loss', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 17, production_date: '2026-03-01' }
    ];

    const result = calcGroup(mockGroup, orders, mockProducts, 0);

    // 17 lbs roasted needed, 15% roast loss
    // roastFactor = 1 - 0.15 = 0.85
    // needed green = 17 / 0.85 = 20
    expect(result.neededRoasted).toBe(17);
    expect(result.roastFactor).toBe(0.85);
    expect(result.needed).toBe(20);
  });

  it('calculates number of batches', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 50, production_date: '2026-03-01' }
    ];

    const result = calcGroup(mockGroup, orders, mockProducts, 0);

    // 50 lbs roasted * (1 / 0.85) = ~58.82 lbs green
    // Standard batch = 20.2 lbs
    // batches = 58.82 / 20.2 = ~2.91
    expect(result.batches).toBeCloseTo(2.91, 1);
    expect(result.batchesUp).toBe(3); // Rounded up
    expect(result.batchWeight).toBe(20.2);
  });

  it('supports batch overrides', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 20, production_date: '2026-03-01' }
    ];

    const overrides = { standard: 25.0 };
    const result = calcGroup(mockGroup, orders, mockProducts, 0, overrides);

    expect(result.batchWeight).toBe(25.0);
  });

  it('handles zero roast loss', () => {
    const noLossGroup: RoastGroup = { ...mockGroup, roast_loss_pct: 0 };
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 20, production_date: '2026-03-01' }
    ];

    const result = calcGroup(noLossGroup, orders, mockProducts, 0);

    // With 0% roast loss, needed green = needed roasted
    expect(result.needed).toBe(result.neededRoasted);
    expect(result.roastFactor).toBe(1);
  });

  it('handles excess leftovers (no roasting needed)', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 10, production_date: '2026-03-01' }
    ];

    const result = calcGroup(mockGroup, orders, mockProducts, 20); // 20 lbs leftover > 10 lbs ordered

    expect(result.totalLbs).toBe(10);
    expect(result.neededRoasted).toBe(0);
    expect(result.needed).toBe(0);
    expect(result.batches).toBe(0);
  });

  it('aggregates multiple orders for same product', () => {
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 5, production_date: '2026-03-01' },
      { id: 'o2', product_id: 'p1', qty: 3, production_date: '2026-03-01' },
      { id: 'o3', product_id: 'p1', qty: 2, production_date: '2026-03-01' }
    ];

    const result = calcGroup(mockGroup, orders, mockProducts, 0);

    // Should combine to 10 total for p1
    expect(result.items).toHaveLength(1);
    expect(result.items[0].totalQty).toBe(10);
    expect(result.totalLbs).toBe(10);
  });

  it('uses dark batch weight for dark roasts', () => {
    const darkGroup: RoastGroup = { ...mockGroup, batch_type: 'dark' };
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 20, production_date: '2026-03-01' }
    ];

    const result = calcGroup(darkGroup, orders, mockProducts, 0);

    expect(result.batchWeight).toBe(19.8); // Dark batch weight
  });

  it('uses decaf batch weight for decaf roasts', () => {
    const decafGroup: RoastGroup = { ...mockGroup, batch_type: 'decaf' };
    const orders: Order[] = [
      { id: 'o1', product_id: 'p1', qty: 20, production_date: '2026-03-01' }
    ];

    const result = calcGroup(decafGroup, orders, mockProducts, 0);

    expect(result.batchWeight).toBe(10.73); // Decaf batch weight
  });
});
