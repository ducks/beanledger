import { describe, expect, it } from 'vitest';
import { compileNameRules, parseNameRulesText, validateNameRules } from './name-rules';
import { parseWithConfig, parseWithConfigDetails } from './generic';

describe('name cleanup rules', () => {
  it('reads quoted patterns and escaped quotes, ignoring blank lines', () => {
    expect(parseNameRulesText('\n"Grind: Whole Bean"\n"plan: {number}"\n"Say \\"hi\\""'))
      .toEqual(['Grind: Whole Bean', 'plan: {number}', 'Say "hi"']);
  });
  it.each(['unquoted', '"unterminated', '123', '"{anything}"', '"{number}"', '"ID {number}{number}"', '""'])('rejects invalid pattern %s', text => {
    expect(() => parseNameRulesText(text)).toThrow();
  });
  it('validates persisted config shape and bounds', () => {
    for (const value of [null, 'rule', [42], Array(21).fill('x'), ['x'.repeat(301)]]) {
      expect(() => validateNameRules(value)).toThrow();
    }
    expect(validateNameRules(undefined)).toEqual([]);
  });
  it('matches case-sensitive literal text, including regex punctuation', () => {
    const clean = compileNameRules(['[a.*+?^$()]', 'Grind: Whole Bean']);
    expect(clean('Coffee [a.*+?^$()] Grind: Whole Bean')).toBe('Coffee');
    expect(clean('Coffee grind: whole bean')).toBe('Coffee grind: whole bean');
    expect(clean('Coffee Grind: Espresso')).toBe('Coffee Grind: Espresso');
  });
  it('removes repeated IDs and does not treat decimals as integer IDs', () => {
    const clean = compileNameRules(['plan: {number}']);
    expect(clean('Coffee plan: 123 plan: 987654321')).toBe('Coffee');
    expect(clean('Coffee plan: 12.34')).toBe('Coffee plan: 12.34');
    expect(clean('Coffee plan: abc')).toBe('Coffee plan: abc');
    expect(clean('Coffee plan:  42')).toBe('Coffee plan:  42'); // exact spaces
  });
  it('applies rules in order and leaves untouched names byte-for-byte unchanged', () => {
    expect(compileNameRules(['X', 'AB'])('AXB Coffee')).toBe('Coffee');
    expect(compileNameRules([])(' Coffee  A ')).toBe(' Coffee  A ');
    expect(compileNameRules(['absent'])(' Coffee  A ')).toBe(' Coffee  A ');
  });
});

const csv = 'Name,Options,Qty\nCoffee - 10.9oz,plan: 123 Grind: Whole Bean,2\nCoffee - 10.9oz,plan: 987 Grind: Whole Bean,3\nCoffee - 10.9oz,plan: 456 Grind: Espresso,4';
const config = {
  productNameColumn: { template: '{Name} {Options}' },
  quantityColumn: 'Qty',
  nameCleanupRules: ['plan: {number}', 'Grind: Whole Bean'],
  aggregate: true
};
describe('import pipeline with cleanup', () => {
  it('cleans before grouping, preserves variants and quantities, and exposes originals', () => {
    const parsed = parseWithConfigDetails(csv, config);
    expect(parsed.rows).toEqual([
      { productName: 'Coffee - 10.9oz', quantity: 5 },
      { productName: 'Coffee - 10.9oz Grind: Espresso', quantity: 4 }
    ]);
    expect(parsed.names).toHaveLength(3);
    expect(parsed.names[0]).toEqual({
      record: 2, original: 'Coffee - 10.9oz plan: 123 Grind: Whole Bean',
      cleaned: 'Coffee - 10.9oz', quantity: 2
    });
    expect(parsed.rows.reduce((sum, row) => sum + row.quantity, 0)).toBe(9);
  });
  it('retains separate rows when aggregation is disabled', () => {
    expect(parseWithConfig(csv, { ...config, aggregate: false })).toHaveLength(3);
  });
  it('leaves old configs unchanged', () => {
    const { nameCleanupRules, ...legacy } = config;
    expect(parseWithConfig(csv, legacy)).toHaveLength(3);
    expect(parseWithConfig(csv, legacy)[0].productName).toContain('plan: 123');
  });
  it('works with a single column and fails the entire parse on a newly empty name', () => {
    expect(() => parseWithConfig('Name,Qty\nCoffee,1\nplan: 123,2', {
      productNameColumn: 'Name', quantityColumn: 'Qty', nameCleanupRules: ['plan: {number}']
    })).toThrow('CSV record 3: cleanup removed the entire product name');
  });
});
