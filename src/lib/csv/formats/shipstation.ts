import type { CsvRow } from '../types';
import type { CsvFormat } from './types';

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
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data row');
    }

    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted values)
      const match = line.match(/^"([^"]*)",\s*"(\d+)"$/);
      if (!match) {
        console.warn(`Skipping malformed line ${i + 1}: ${line}`);
        continue;
      }

      const productName = match[1];
      const quantity = parseInt(match[2], 10);

      // Skip non-product rows (discounts, etc)
      if (productName.includes('DISCOUNT') || productName.includes('Additional')) {
        continue;
      }

      rows.push({ productName, quantity });
    }

    return rows;
  }
};
