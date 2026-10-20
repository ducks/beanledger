import type { CsvRow } from '../types';
import { type CsvFormat, parseCsv } from './types';

/**
 * ShipStation export format: "Item - Name","Item - Qty"
 */
export const shipstationFormat: CsvFormat = {
  id: 'shipstation',
  name: 'ShipStation',
  description: 'ShipStation order export ("Item - Name","Item - Qty")',

  detect(headers) {
    return headers.includes('item - name') && headers.includes('item - qty');
  },

  parse(csvText) {
    const records = parseCsv(csvText);
    if (records.length < 2) {
      throw new Error('CSV must have at least a header and one data row');
    }

    // Real ShipStation exports carry dozens of columns; find ours by name
    // rather than assuming a two-column file.
    const headers = records[0].map((h) => h.toLowerCase());
    const nameCol = headers.indexOf('item - name');
    const qtyCol = headers.indexOf('item - qty');
    if (nameCol < 0 || qtyCol < 0) {
      throw new Error('ShipStation export needs "Item - Name" and "Item - Qty" columns');
    }

    const rows: CsvRow[] = [];
    for (const cols of records.slice(1)) {
      const productName = cols[nameCol] ?? '';
      const quantity = parseInt(cols[qtyCol] ?? '', 10);
      if (!productName || !Number.isFinite(quantity) || quantity <= 0) continue;

      // Skip non-product rows (discounts, etc)
      if (productName.includes('DISCOUNT') || productName.includes('Additional')) {
        continue;
      }

      rows.push({ productName, quantity });
    }

    return rows;
  }
};
