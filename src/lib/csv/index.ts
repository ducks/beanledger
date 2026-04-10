import type { Product, ImportAlias } from '../types';
import type { CsvRow, MatchResult } from './types';
import { detectFormat, getFormat, formats } from './formats/registry';

export type { CsvRow, MatchResult } from './types';
export type { CsvFormat } from './formats/types';
export { formats, getFormat, detectFormat } from './formats/registry';

/**
 * Parse CSV text into rows. If `formatId` is provided, uses that format
 * explicitly; otherwise auto-detects.
 */
export function parseOrderCsv(csvText: string, formatId?: string): CsvRow[] {
  if (formatId) {
    const format = getFormat(formatId);
    if (!format) {
      throw new Error(`Unknown CSV format: ${formatId}`);
    }
    return format.parse(csvText);
  }

  const format = detectFormat(csvText);
  if (!format) {
    throw new Error(
      'Could not detect CSV format. Please select a format manually.'
    );
  }
  return format.parse(csvText);
}

/**
 * Match CSV rows to products from database.
 * Checks exact product name match first, then active import aliases.
 */
export function matchProducts(
  csvRows: CsvRow[],
  products: Product[],
  aliases: ImportAlias[] = []
): MatchResult[] {
  const activeAliases = aliases.filter((a) => a.active);

  return csvRows.map((row) => {
    const exactMatch = products.find(
      (p) => p.name.toLowerCase() === row.productName.toLowerCase()
    );

    if (exactMatch) {
      return {
        productName: row.productName,
        quantity: row.quantity,
        matchedProduct: exactMatch,
        confidence: 'exact'
      };
    }

    const aliasMatch = activeAliases.find(
      (a) => a.alias_name.toLowerCase() === row.productName.toLowerCase()
    );

    if (aliasMatch) {
      const aliasedProduct = products.find((p) => p.id === aliasMatch.product_id);
      if (aliasedProduct) {
        return {
          productName: row.productName,
          quantity: row.quantity,
          matchedProduct: aliasedProduct,
          confidence: 'alias'
        };
      }
    }

    return {
      productName: row.productName,
      quantity: row.quantity,
      matchedProduct: null,
      confidence: 'none'
    };
  });
}

/**
 * Generate unique ID for order
 */
export function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Strip TRADE prefix and size suffix to extract group label
 * E.g., "TRADE Sure Thing - 10.9oz" -> "Sure Thing"
 */
export function skuToGroupLabel(name: string): string {
  const noSize = name.replace(/\s*-\s*[\d.]+\s*(oz|lb)\s*$/i, '').trim();
  const noPrefix = noSize.replace(/^TRADE\s+/i, '').trim();
  return noPrefix;
}

/**
 * Parse weight from SKU name
 * E.g., "Sure Thing - 10.9oz" -> 0.68125 (lbs)
 */
export function parseLbsFromSkuName(name: string): number {
  const match = name.match(/([\d.]+)\s*(oz|lb)s?\s*$/i);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'oz') {
    return num / 16;
  } else {
    return num;
  }
}
