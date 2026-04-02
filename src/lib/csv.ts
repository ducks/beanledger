import type { Product, ImportAlias } from './types';

export interface CsvRow {
  productName: string;
  quantity: number;
}

export interface MatchResult {
  productName: string;
  quantity: number;
  matchedProduct: Product | null;
  confidence: 'exact' | 'alias' | 'fuzzy' | 'none';
}

/**
 * Formats batch size to standard format (e.g., "10.934oz" -> "10.9oz", "32 oz" -> "2lb")
 */
function formatBatchSize(sizeStr: string): string {
  const trimmed = sizeStr.trim().toLowerCase();

  // Extract number and unit
  const match = trimmed.match(/^([\d.]+)\s*(oz|lb)s?$/i);
  if (!match) return sizeStr;

  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'oz') {
    // If >= 16oz, convert to lb
    if (num >= 16) {
      const lbs = num / 16;
      return `${Math.round(lbs * 10) / 10}lb`;
    }
    // Round oz to 1 decimal
    return `${Math.round(num * 10) / 10}oz`;
  } else {
    // Round lb to 1 decimal
    return `${Math.round(num * 10) / 10}lb`;
  }
}

/**
 * Parse CSV text into rows
 * Supports two formats:
 * 1. ShipStation: "Item - Name","Item - Qty"
 * 2. TRADE batch: internal_id,size,quantity (aggregates by SKU)
 */
export function parseOrderCsv(csvText: string): CsvRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  // Parse header
  const headerLine = lines[0].trim();
  const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  // Detect TRADE batch format
  const internalIdCol = headers.indexOf('internal_id');
  const sizeCol = headers.indexOf('size');
  const quantityCol = headers.indexOf('quantity');
  const isTradeBatch = internalIdCol !== -1 && sizeCol !== -1 && quantityCol !== -1;

  if (isTradeBatch) {
    // TRADE batch format: aggregate by internal_id + size
    const tally = new Map<string, number>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
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
  } else {
    // ShipStation format: name, qty
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
      if (
        productName.includes('DISCOUNT') ||
        productName.includes('Additional')
      ) {
        continue;
      }

      rows.push({ productName, quantity });
    }

    return rows;
  }
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
  const activeAliases = aliases.filter(a => a.active);

  return csvRows.map((row) => {
    // Try exact product name match first
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

    // Try alias match
    const aliasMatch = activeAliases.find(
      (a) => a.alias_name.toLowerCase() === row.productName.toLowerCase()
    );

    if (aliasMatch) {
      const aliasedProduct = products.find(p => p.id === aliasMatch.product_id);
      if (aliasedProduct) {
        return {
          productName: row.productName,
          quantity: row.quantity,
          matchedProduct: aliasedProduct,
          confidence: 'alias'
        };
      }
    }

    // No match found - allow user to add product
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
  // Remove size suffix
  const noSize = name.replace(/\s*-\s*[\d.]+\s*(oz|lb)\s*$/i, '').trim();
  // Remove TRADE prefix
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
