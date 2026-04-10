import { describe, it, expect } from 'vitest';
import { parseWithConfig } from './generic';

const shipstationCsv = `"Item - Name","Item - Qty"
"Ethiopia Natural - 10oz","4"
"Guatemala Honey - 5lb","2"
"Sure Thing - 12oz","7"`;

const tradeCsv = `internal_id,size,quantity
Sure Thing,10.9oz,5
Sure Thing,10.9oz,3
Nano Genji,12oz,2
Nano Genji,2lb,1`;

const squareCsv = `Item,Variation,Qty Sold,Net Sales
Ethiopia Natural,10oz Bag,4,$40.00
Guatemala Honey,5lb Bag,2,$100.00`;

describe('parseWithConfig', () => {
  describe('simple column mapping', () => {
    it('parses a two-column CSV', () => {
      const rows = parseWithConfig(shipstationCsv, {
        productNameColumn: 'item - name',
        quantityColumn: 'item - qty'
      });

      expect(rows).toEqual([
        { productName: 'Ethiopia Natural - 10oz', quantity: 4 },
        { productName: 'Guatemala Honey - 5lb', quantity: 2 },
        { productName: 'Sure Thing - 12oz', quantity: 7 }
      ]);
    });

    it('is case-insensitive for column names', () => {
      const rows = parseWithConfig(shipstationCsv, {
        productNameColumn: 'ITEM - NAME',
        quantityColumn: 'ITEM - QTY'
      });

      expect(rows).toHaveLength(3);
      expect(rows[0].productName).toBe('Ethiopia Natural - 10oz');
    });

    it('skips empty lines', () => {
      const csv = `name,qty
Product A,3

Product B,5
`;
      const rows = parseWithConfig(csv, {
        productNameColumn: 'name',
        quantityColumn: 'qty'
      });

      expect(rows).toHaveLength(2);
    });

    it('skips rows with zero or negative quantity', () => {
      const csv = `name,qty
Product A,3
Product B,0
Product C,-1
Product D,2`;
      const rows = parseWithConfig(csv, {
        productNameColumn: 'name',
        quantityColumn: 'qty'
      });

      expect(rows).toEqual([
        { productName: 'Product A', quantity: 3 },
        { productName: 'Product D', quantity: 2 }
      ]);
    });

    it('skips rows with non-numeric quantity', () => {
      const csv = `name,qty
Product A,3
Product B,abc
Product C,2`;
      const rows = parseWithConfig(csv, {
        productNameColumn: 'name',
        quantityColumn: 'qty'
      });

      expect(rows).toHaveLength(2);
    });
  });

  describe('template mode', () => {
    it('combines columns with a template', () => {
      const rows = parseWithConfig(squareCsv, {
        productNameColumn: { template: '{item} - {variation}' },
        quantityColumn: 'qty sold'
      });

      expect(rows).toEqual([
        { productName: 'Ethiopia Natural - 10oz Bag', quantity: 4 },
        { productName: 'Guatemala Honey - 5lb Bag', quantity: 2 }
      ]);
    });

    it('handles template with prefix text', () => {
      const rows = parseWithConfig(tradeCsv, {
        productNameColumn: { template: 'TRADE {internal_id} - {size}' },
        quantityColumn: 'quantity'
      });

      expect(rows).toHaveLength(4);
      expect(rows[0].productName).toBe('TRADE Sure Thing - 10.9oz');
    });

    it('handles single column in template', () => {
      const rows = parseWithConfig(shipstationCsv, {
        productNameColumn: { template: '{item - name}' },
        quantityColumn: 'item - qty'
      });

      expect(rows).toHaveLength(3);
      expect(rows[0].productName).toBe('Ethiopia Natural - 10oz');
    });

    it('throws when template references missing column', () => {
      const csv = `name,qty
Product A,3`;

      expect(() => parseWithConfig(csv, {
        productNameColumn: { template: '{name} - {missing}' },
        quantityColumn: 'qty'
      })).toThrow('Column(s) not found');
    });
  });

  describe('aggregation', () => {
    it('sums quantities for duplicate product names', () => {
      const rows = parseWithConfig(tradeCsv, {
        productNameColumn: { template: 'TRADE {internal_id} - {size}' },
        quantityColumn: 'quantity',
        aggregate: true
      });

      expect(rows).toEqual([
        { productName: 'TRADE Sure Thing - 10.9oz', quantity: 8 },
        { productName: 'TRADE Nano Genji - 12oz', quantity: 2 },
        { productName: 'TRADE Nano Genji - 2lb', quantity: 1 }
      ]);
    });

    it('does not aggregate when flag is false', () => {
      const rows = parseWithConfig(tradeCsv, {
        productNameColumn: { template: 'TRADE {internal_id} - {size}' },
        quantityColumn: 'quantity',
        aggregate: false
      });

      expect(rows).toHaveLength(4);
    });

    it('aggregates with simple column mapping', () => {
      const csv = `name,qty
Coffee A,3
Coffee B,2
Coffee A,5`;
      const rows = parseWithConfig(csv, {
        productNameColumn: 'name',
        quantityColumn: 'qty',
        aggregate: true
      });

      expect(rows).toEqual([
        { productName: 'Coffee A', quantity: 8 },
        { productName: 'Coffee B', quantity: 2 }
      ]);
    });
  });

  describe('error handling', () => {
    it('throws on empty CSV', () => {
      expect(() => parseWithConfig('', {
        productNameColumn: 'name',
        quantityColumn: 'qty'
      })).toThrow('at least a header');
    });

    it('throws on header-only CSV', () => {
      expect(() => parseWithConfig('name,qty', {
        productNameColumn: 'name',
        quantityColumn: 'qty'
      })).toThrow('at least a header');
    });

    it('throws when product name column not found', () => {
      expect(() => parseWithConfig(shipstationCsv, {
        productNameColumn: 'nonexistent',
        quantityColumn: 'item - qty'
      })).toThrow('not found');
    });

    it('throws when quantity column not found', () => {
      expect(() => parseWithConfig(shipstationCsv, {
        productNameColumn: 'item - name',
        quantityColumn: 'nonexistent'
      })).toThrow('not found');
    });

    it('throws when template references missing column', () => {
      expect(() => parseWithConfig(shipstationCsv, {
        productNameColumn: { template: '{item - name} - {bogus}' },
        quantityColumn: 'item - qty'
      })).toThrow('not found');
    });

    it('returns empty array when all rows are invalid', () => {
      const csv = `name,qty
,3
Product A,abc
,`;
      const rows = parseWithConfig(csv, {
        productNameColumn: 'name',
        quantityColumn: 'qty'
      });

      expect(rows).toEqual([]);
    });
  });
});
