import type { CsvRow } from '../types';
import { parseHeaders, splitCsvLine } from './types';

/**
 * Product name field specification.
 * Simple: a single column name.
 * Template: combine multiple columns using {column_name} placeholders.
 */
export type ProductNameSpec =
  | string
  | { template: string };

/**
 * Configuration for the generic CSV format parser.
 * All user-defined formats and built-in formats (stored in the database)
 * share this config shape.
 */
export interface GenericFormatConfig {
  /** Column name or template for the product identifier */
  productNameColumn: ProductNameSpec;
  /** Header name of the column containing the quantity */
  quantityColumn: string;
  /** When true, sum quantities for rows with the same product name */
  aggregate?: boolean;
}

/**
 * Resolve a product name from a row of columns using the spec.
 * For a simple string, returns the value at that column index.
 * For a template, replaces all {column_name} placeholders with column values.
 */
function resolveProductName(
  spec: ProductNameSpec,
  cols: string[],
  headerIndex: Map<string, number>
): string {
  if (typeof spec === 'string') {
    const idx = headerIndex.get(spec.toLowerCase().trim());
    return idx !== undefined ? cols[idx] : '';
  }

  return spec.template.replace(/\{([^}]+)\}/g, (_match, colName: string) => {
    const idx = headerIndex.get(colName.toLowerCase().trim());
    return idx !== undefined ? cols[idx] : '';
  }).trim();
}

/**
 * Validate that all columns referenced by the config exist in the headers.
 * Returns an array of missing column names (empty if all valid).
 */
function validateColumns(
  spec: ProductNameSpec,
  qtyColumn: string,
  headerIndex: Map<string, number>
): string[] {
  const missing: string[] = [];

  if (typeof spec === 'string') {
    if (!headerIndex.has(spec.toLowerCase().trim())) {
      missing.push(spec);
    }
  } else {
    const referenced = [...spec.template.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
    for (const col of referenced) {
      if (!headerIndex.has(col.toLowerCase().trim())) {
        missing.push(col);
      }
    }
  }

  if (!headerIndex.has(qtyColumn.toLowerCase().trim())) {
    missing.push(qtyColumn);
  }

  return missing;
}

/**
 * Parse a CSV using the given column mapping config.
 *
 * The config names columns by their header text (case-insensitive, trimmed).
 * Product name can be a single column or a template combining multiple columns.
 * Rows with missing or invalid values are skipped. If `aggregate` is true,
 * rows sharing the same product name are summed.
 */
export function parseWithConfig(
  csvText: string,
  config: GenericFormatConfig
): CsvRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  const headers = parseHeaders(lines[0]);
  const headerIndex = new Map(headers.map((h, i) => [h, i]));

  const missing = validateColumns(config.productNameColumn, config.quantityColumn, headerIndex);
  if (missing.length > 0) {
    throw new Error(`Column(s) not found in CSV headers: ${missing.join(', ')}`);
  }

  const qtyCol = headerIndex.get(config.quantityColumn.toLowerCase().trim())!;

  const rows: CsvRow[] = [];
  const tally = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCsvLine(line);
    const productName = resolveProductName(config.productNameColumn, cols, headerIndex);
    const qty = parseInt(cols[qtyCol], 10);

    if (!productName || isNaN(qty) || qty <= 0) continue;

    if (config.aggregate) {
      tally.set(productName, (tally.get(productName) || 0) + qty);
    } else {
      rows.push({ productName, quantity: qty });
    }
  }

  if (config.aggregate) {
    return Array.from(tally.entries()).map(([productName, quantity]) => ({
      productName,
      quantity
    }));
  }

  return rows;
}
