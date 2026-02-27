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
 * Parse CSV text into rows
 * Expected format: "Item - Name","Item - Qty"
 */
export function parseOrderCsv(csvText: string): CsvRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  const rows: CsvRow[] = [];

  // Skip header (line 0)
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

    // Try fuzzy match (contains or is contained)
    const fuzzyMatch = products.find((p) => {
      const pLower = p.name.toLowerCase();
      const rowLower = row.productName.toLowerCase();
      return pLower.includes(rowLower) || rowLower.includes(pLower);
    });

    if (fuzzyMatch) {
      return {
        productName: row.productName,
        quantity: row.quantity,
        matchedProduct: fuzzyMatch,
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
