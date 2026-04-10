import type { Product } from '../types';

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
