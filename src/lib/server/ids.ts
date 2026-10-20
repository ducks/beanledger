import { randomUUID } from 'crypto';

/** Server-generated ids: a short prefix for readability plus a UUID. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/** Today's date in YYYY-MM-DD, for created_at columns typed DATE. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
