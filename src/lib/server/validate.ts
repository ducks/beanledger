/**
 * Minimal request validation. Every mutating route parses its body through
 * these helpers so that ids, numbers, dates, and enums are checked once,
 * at the edge, with a 400 and a readable message instead of a 500 from
 * Postgres or a silently wrong number in the planner.
 */
import { json } from '@sveltejs/kit';

export class ValidationError extends Error {
  readonly status = 400;
}

const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Body = Record<string, unknown>;

export async function readBody(request: Request): Promise<Body> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError('Request body must be JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return body as Body;
}

export function requireString(body: Body, key: string, max = 200): string {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${key} is required`);
  }
  if (value.length > max) {
    throw new ValidationError(`${key} must be at most ${max} characters`);
  }
  return value.trim();
}

export function optionalString(body: Body, key: string, max = 2000): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ValidationError(`${key} must be a string`);
  if (value.length > max) throw new ValidationError(`${key} must be at most ${max} characters`);
  return value;
}

export function requireNumber(
  body: Body,
  key: string,
  opts: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const raw = body[key];
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${key} must be a number`);
  }
  if (opts.integer && !Number.isInteger(value)) {
    throw new ValidationError(`${key} must be a whole number`);
  }
  if (opts.min !== undefined && value < opts.min) {
    throw new ValidationError(`${key} must be at least ${opts.min}`);
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new ValidationError(`${key} must be at most ${opts.max}`);
  }
  return value;
}

export function optionalBoolean(body: Body, key: string, fallback: boolean): boolean {
  const value = body[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw new ValidationError(`${key} must be true or false`);
  return value;
}

/** A client may propose an id (the catalog UI lets people type group ids);
 *  it must be short and URL-safe. Absent means the server generates one. */
export function optionalId(body: Body, key = 'id'): string | undefined {
  const value = body[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new ValidationError(`${key} must be 1-64 characters of letters, digits, _ . : -`);
  }
  return value;
}

export function requireId(body: Body, key = 'id'): string {
  const value = optionalId(body, key);
  if (value === undefined) throw new ValidationError(`${key} is required`);
  return value;
}

export function requireDate(body: Body, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${key} must be a date in YYYY-MM-DD form`);
  }
  return value;
}

export function optionalDate(body: Body, key: string): string | undefined {
  if (body[key] === undefined || body[key] === null || body[key] === '') return undefined;
  return requireDate(body, key);
}

export function requireEnum<T extends string>(body: Body, key: string, values: readonly T[]): T {
  const value = body[key];
  if (typeof value !== 'string' || !(values as readonly string[]).includes(value)) {
    throw new ValidationError(`${key} must be one of: ${values.join(', ')}`);
  }
  return value as T;
}

/** Validate a path or query parameter the same way as a body id. */
export function paramId(value: string | null, name: string): string {
  if (!value || !ID_PATTERN.test(value)) {
    throw new ValidationError(`${name} must be 1-64 characters of letters, digits, _ . : -`);
  }
  return value;
}

export function paramDate(value: string | null, name: string): string {
  if (!value || !DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${name} must be a date in YYYY-MM-DD form`);
  }
  return value;
}

/**
 * Run a handler; a ValidationError becomes a 400 with its message, any
 * other error is logged and becomes a 500 without leaking internals.
 */
export async function handle(what: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, { status: 400 });
    }
    console.error(`${what} failed:`, err);
    return json({ error: `${what} failed` }, { status: 500 });
  }
}
