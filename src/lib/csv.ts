import type { Product } from './types';

export interface CsvRow {
  productName: string;
  quantity: number;
}

export interface MatchResult {
  productName: string;
  quantity: number;
  matchedProduct: Product | null;
  confidence: 'exact' | 'fuzzy' | 'none';
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

      // Skip non-product rows (discounts, subscriptions, etc)
      if (
        productName.includes('DISCOUNT') ||
        productName.includes('Subscription') ||
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
 * Calculate similarity score between two strings
 * Returns a score from 0-100, where 100 is a perfect match
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 100;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    // Prefer shorter strings (less difference in length)
    const lenDiff = Math.abs(s1.length - s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return 80 - (lenDiff / maxLen) * 30; // Score 50-80 based on length difference
  }

  // Simple Levenshtein distance for other cases
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  const similarity = (1 - distance / maxLen) * 100;

  return similarity;
}

/**
 * Match CSV rows to products from database
 */
export function matchProducts(
  csvRows: CsvRow[],
  products: Product[]
): MatchResult[] {
  return csvRows.map((row) => {
    // Try exact match first
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

    // Score all products and find the best match
    const scoredProducts = products.map(p => ({
      product: p,
      score: calculateSimilarity(p.name, row.productName)
    }));

    // Sort by score descending
    scoredProducts.sort((a, b) => b.score - a.score);

    // Use best match if score is above threshold (50)
    const bestMatch = scoredProducts[0];
    if (bestMatch && bestMatch.score >= 50) {
      return {
        productName: row.productName,
        quantity: row.quantity,
        matchedProduct: bestMatch.product,
        confidence: 'fuzzy'
      };
    }

    // No match found
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
