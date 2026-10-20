import type { CsvRow } from '../types';
import { type CsvFormat, parseCsv, formatBatchSize } from './types';

/**
 * TRADE batch format: aggregates rows by internal_id + size.
 * Expected headers: internal_id, size, quantity
 */
export const tradeFormat: CsvFormat = {
  id: 'trade',
  name: 'TRADE Batch',
  description: 'Aggregated batch export from TRADE (internal_id, size, quantity)',

  detect(headers) {
    return (
      headers.includes('internal_id') &&
      headers.includes('size') &&
      headers.includes('quantity')
    );
  },

  parse(csvText) {
    const records = parseCsv(csvText);
    if (records.length < 2) {
      throw new Error('CSV must have at least a header and one data row');
    }

    const headers = records[0].map((h) => h.toLowerCase());
    const internalIdCol = headers.indexOf('internal_id');
    const sizeCol = headers.indexOf('size');
    const quantityCol = headers.indexOf('quantity');

    const tally = new Map<string, number>();

    for (const cols of records.slice(1)) {
      if (cols.length < Math.max(internalIdCol, sizeCol, quantityCol) + 1) continue;

      const internalId = cols[internalIdCol];
      const size = cols[sizeCol];
      const qty = parseInt(cols[quantityCol], 10);

      if (!internalId || !size || isNaN(qty)) continue;

      const sku = `TRADE ${internalId} - ${formatBatchSize(size)}`;
      tally.set(sku, (tally.get(sku) || 0) + qty);
    }

    return Array.from(tally.entries()).map(([productName, quantity]) => ({
      productName,
      quantity
    }));
  }
};
