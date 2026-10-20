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

/**
 * Tokenize CSV text into records (RFC 4180): fields are separated by
 * commas, a field may be wrapped in double quotes, a quoted field may
 * contain commas, newlines, and doubled quotes (`""`) for a literal quote.
 * Handles CRLF line endings and a leading UTF-8 BOM. Blank lines are
 * dropped. Field values are trimmed; quoting is not preserved.
 */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  const endField = () => {
    record.push(field.trim());
    field = '';
  };
  const endRecord = () => {
    endField();
    if (record.some((value) => value !== '')) records.push(record);
    record = [];
  };

  while (i < input.length) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field.trim() === '') {
      quoted = true;
      field = '';
      i += 1;
      continue;
    }
    if (ch === ',') {
      endField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '\n') {
      endRecord();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field !== '' || record.length > 0) endRecord();
  return records;
}

/** Header names, normalized (trimmed, unquoted, lowercased). */
export function parseHeaders(headerLine: string): string[] {
  return (parseCsv(headerLine)[0] ?? []).map((h) => h.toLowerCase());
}

/** Split one CSV line into trimmed, unquoted columns. */
export function splitCsvLine(line: string): string[] {
  return parseCsv(line)[0] ?? [];
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
