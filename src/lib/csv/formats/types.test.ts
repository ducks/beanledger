import { describe, it, expect } from 'vitest';
import { parseCsv, parseHeaders, splitCsvLine } from './types';
import { parseWithConfig } from './generic';
import { shipstationFormat } from './shipstation';
import { tradeFormat } from './trade';
import { detectFormat } from './registry';

describe('parseCsv', () => {
  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('name,qty\n"Ethiopia, Natural - 12oz",3')).toEqual([
      ['name', 'qty'],
      ['Ethiopia, Natural - 12oz', '3']
    ]);
  });

  it('unescapes doubled quotes and keeps embedded newlines', () => {
    expect(parseCsv('a,b\n"He said ""hi""","line one\nline two"')).toEqual([
      ['a', 'b'],
      ['He said "hi"', 'line one\nline two']
    ]);
  });

  it('handles CRLF, a BOM, trailing newline, and blank lines', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n\r\n3,4\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4']
    ]);
  });

  it('trims unquoted fields and preserves empty ones', () => {
    expect(parseCsv('a, b ,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3']
    ]);
  });

  it('powers the single-line helpers', () => {
    expect(parseHeaders('"Item - Name","Item - Qty"')).toEqual(['item - name', 'item - qty']);
    expect(splitCsvLine('"Yirgacheffe, washed",2')).toEqual(['Yirgacheffe, washed', '2']);
  });
});

describe('parsers on names with commas', () => {
  it('generic config', () => {
    const rows = parseWithConfig('Item,Qty\n"Ethiopia, Natural",2\n"Kenya ""AA""",1', {
      productNameColumn: 'item',
      quantityColumn: 'qty'
    });
    expect(rows).toEqual([
      { productName: 'Ethiopia, Natural', quantity: 2 },
      { productName: 'Kenya "AA"', quantity: 1 }
    ]);
  });

  it('TRADE batch', () => {
    const rows = tradeFormat.parse('internal_id,size,quantity\n"Sure, Thing",10.9oz,5\n"Sure, Thing",10.9oz,2');
    expect(rows).toEqual([{ productName: 'TRADE Sure, Thing - 10.9oz', quantity: 7 }]);
  });

  it('ShipStation, including a real multi-column export', () => {
    const csv = [
      'Order - Number,Order - Date,Item - SKU,"Item - Name","Item - Qty",Item - Unit Price',
      '1001,2026-10-20,ETH12,"Ethiopia, Natural - 12oz",2,$18.00',
      '1001,2026-10-20,DISC,DISCOUNT - Welcome,1,-$5.00',
      '1002,2026-10-20,GUA5,"Guatemala Honey - 5lb",1,$70.00',
      '1003,2026-10-20,ADD,Additional shipping,1,$4.00'
    ].join('\r\n');
    expect(detectFormat(csv)?.id).toBe('shipstation');
    expect(shipstationFormat.parse(csv)).toEqual([
      { productName: 'Ethiopia, Natural - 12oz', quantity: 2 },
      { productName: 'Guatemala Honey - 5lb', quantity: 1 }
    ]);
    expect(() => shipstationFormat.parse('a,b\n1,2')).toThrow(/Item - Name/);
  });
});
