import type { CsvRow } from '../types';

export interface CsvFormat {
  /** Stable identifier used for manual format selection and storage */
  id: string;
  /** Human-readable name shown in the UI */
  name: string;
  /** Short description of the format / source */
  description: string;
  /**
   * Auto-detect whether a CSV matches this format.
   * Receives lowercased, unquoted header names and optionally a few sample rows.
   */
  detect(headers: string[], sampleRows?: string[][]): boolean;
  /** Parse the full CSV text into rows */
  parse(csvText: string): CsvRow[];
}

/** Split a header line into normalized (trimmed, unquoted, lowercased) headers */
export function parseHeaders(headerLine: string): string[] {
  return headerLine
    .split(',')
    .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
}

/** Split a CSV line into trimmed, unquoted columns (simple parser, no embedded commas) */
export function splitCsvLine(line: string): string[] {
  return line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
}

/**
 * Formats batch size to standard format (e.g., "10.934oz" -> "10.9oz", "32 oz" -> "2lb")
 */
export function formatBatchSize(sizeStr: string): string {
  const trimmed = sizeStr.trim().toLowerCase();

  const match = trimmed.match(/^([\d.]+)\s*(oz|lb)s?$/i);
  if (!match) return sizeStr;

  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'oz') {
    if (num >= 16) {
      const lbs = num / 16;
      return `${Math.round(lbs * 10) / 10}lb`;
    }
    return `${Math.round(num * 10) / 10}oz`;
  } else {
    return `${Math.round(num * 10) / 10}lb`;
  }
}
