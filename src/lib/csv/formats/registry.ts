import { type CsvFormat, parseHeaders } from './types';
import { tradeFormat } from './trade';
import { shipstationFormat } from './shipstation';

/** All registered CSV formats, in detection priority order */
export const formats: CsvFormat[] = [
  tradeFormat,
  shipstationFormat
];

/** Look up a format by its id */
export function getFormat(id: string): CsvFormat | undefined {
  return formats.find((f) => f.id === id);
}

/**
 * Auto-detect the format of a CSV by inspecting its headers.
 * Returns the first matching format, or undefined if no format matches.
 */
export function detectFormat(csvText: string): CsvFormat | undefined {
  const firstLine = csvText.trim().split('\n')[0];
  if (!firstLine) return undefined;

  const headers = parseHeaders(firstLine);
  return formats.find((f) => f.detect(headers));
}
