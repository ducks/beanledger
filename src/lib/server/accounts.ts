/**
 * Account plumbing shared by the auth and tenant routes: one-time email
 * tokens, invites, login rate limiting, and session hygiene.
 */
import { createHash, randomBytes } from 'crypto';
import type pg from 'pg';
import { query, withTransaction } from '$lib/db';
import { sendMail, linkBase, assertMailConfigured } from './mail';

type Queryable = Pick<pg.PoolClient, 'query'>;

export const VERIFY_TOKEN_HOURS = 48;
export const RESET_TOKEN_MINUTES = 60;
export const INVITE_DAYS = 7;
export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_MAX_FAILURES = 10;

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('hex');
}

// Expiries are computed in SQL from the database clock. Passing a JS Date
// into a TIMESTAMP (without time zone) column drops the offset, which made
// a 60-minute token expire on arrival on a server whose session time zone
// differs from the host's.

// ---- email tokens -----------------------------------------------------------

export async function issueEmailToken(
  db: Queryable,
  userId: string,
  kind: 'verify' | 'reset'
): Promise<string> {
  const raw = newToken();
  const minutes = kind === 'verify' ? VERIFY_TOKEN_HOURS * 60 : RESET_TOKEN_MINUTES;
  // All callers use a transaction: serialize replacements so concurrent
  // requests cannot leave multiple unused tokens of the same kind.
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`email-token:${kind}:${userId}`]);
  // A fresh token replaces any outstanding one of the same kind.
  await db.query('DELETE FROM email_tokens WHERE user_id = $1 AND kind = $2 AND used_at IS NULL', [userId, kind]);
  await db.query(
    `INSERT INTO email_tokens (user_id, kind, token_hash, expires_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + make_interval(mins => $4))`,
    [userId, kind, hashToken(raw), minutes]
  );
  return raw;
}

/** Consume a token: returns the user id, or null if unknown, used, or expired. */
export async function consumeEmailToken(
  db: Queryable,
  raw: string,
  kind: 'verify' | 'reset'
): Promise<string | null> {
  const result = await db.query<{ user_id: string }>(
    `UPDATE email_tokens SET used_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     RETURNING user_id`,
    [hashToken(raw), kind]
  );
  return result.rows[0]?.user_id ?? null;
}

export async function sendVerificationMail(db: Queryable, user: { id: string; email: string }, origin: string): Promise<void> {
  const base = linkBase(origin);
  assertMailConfigured();
  const token = await issueEmailToken(db, user.id, 'verify');
  await sendMail({
    to: user.email,
    subject: 'Verify your BeanLedger email',
    text: `Confirm this address for your BeanLedger account:\n\n${base}/verify?token=${token}\n\nThe link is valid for ${VERIFY_TOKEN_HOURS} hours. If you did not sign up, ignore this message.`
  });
}

export async function sendResetMail(db: Queryable, user: { id: string; email: string }, origin: string): Promise<void> {
  const base = linkBase(origin);
  assertMailConfigured();
  const token = await issueEmailToken(db, user.id, 'reset');
  await sendMail({
    to: user.email,
    subject: 'Reset your BeanLedger password',
    text: `Choose a new password here:\n\n${base}/reset-password?token=${token}\n\nThe link is valid for ${RESET_TOKEN_MINUTES} minutes. If you did not ask for this, your password is unchanged.`
  });
}

// ---- invites ----------------------------------------------------------------

export async function createInvite(
  db: Queryable,
  tenant: { id: string; name: string },
  invitedBy: string,
  email: string,
  role: 'owner' | 'staff',
  origin: string
): Promise<{ id: string }> {
  const base = linkBase(origin);
  assertMailConfigured();
  const raw = newToken();
  await db.query('DELETE FROM invites WHERE tenant_id = $1 AND email = $2 AND accepted_at IS NULL', [tenant.id, email]);
  const result = await db.query<{ id: string }>(
    `INSERT INTO invites (tenant_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + make_interval(days => $6)) RETURNING id`,
    [tenant.id, email, role, hashToken(raw), invitedBy, INVITE_DAYS]
  );
  await sendMail({
    to: email,
    subject: `You're invited to ${tenant.name} on BeanLedger`,
    text: `You have been invited to join ${tenant.name} as ${role}.\n\nAccept here:\n\n${base}/invite?token=${raw}\n\nThe invitation is valid for ${INVITE_DAYS} days.`
  });
  return result.rows[0];
}

export interface PendingInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: 'owner' | 'staff';
}

/** Look up a live invite without consuming it (for the accept page). */
export async function findInvite(db: Queryable, raw: string): Promise<PendingInvite | null> {
  const result = await db.query<PendingInvite>(
    `SELECT id, tenant_id, email, role FROM invites
     WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    [hashToken(raw)]
  );
  return result.rows[0] ?? null;
}

// Serialize checks for the same key so concurrent requests cannot all pass
// a check-then-insert race. The lock and insert are scoped to one transaction.
export async function consumeRateLimit(key: string, maximum: number, windowMinutes: number): Promise<boolean> {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
    await client.query(
      'DELETE FROM login_attempts WHERE key = $1 AND attempted_at <= CURRENT_TIMESTAMP - make_interval(mins => $2)',
      [key, windowMinutes]
    );
    const result = await client.query<{ n: string }>(
      'SELECT COUNT(*) AS n FROM login_attempts WHERE key = $1 AND attempted_at > CURRENT_TIMESTAMP - make_interval(mins => $2)',
      [key, windowMinutes]
    );
    if (Number(result.rows[0].n) >= maximum) return false;
    await client.query('INSERT INTO login_attempts (key) VALUES ($1)', [key]);
    return true;
  });
}

// ---- login rate limiting ---------------------------------------------------

/** True when either the username or the address alone has too many recent failures. */
export async function loginBlocked(username: string, address: string): Promise<boolean> {
  const result = await query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM login_attempts
     WHERE key = ANY($1) AND attempted_at > CURRENT_TIMESTAMP - make_interval(mins => $2)
     GROUP BY key
     ORDER BY n DESC
     LIMIT 1`,
    [[`user:${username.toLowerCase()}`, `addr:${address}`], LOGIN_WINDOW_MINUTES]
  );
  return result.rows.length > 0 && parseInt(result.rows[0].n, 10) >= LOGIN_MAX_FAILURES;
}

export async function recordLoginFailure(username: string, address: string): Promise<void> {
  await query('INSERT INTO login_attempts (key) VALUES ($1), ($2)', [`user:${username.toLowerCase()}`, `addr:${address}`]);
}

export async function clearLoginFailures(username: string): Promise<void> {
  await query('DELETE FROM login_attempts WHERE key = $1', [`user:${username.toLowerCase()}`]);
}

// ---- sessions ---------------------------------------------------------------

/** Drop expired sessions and stale rate-limit rows. Cheap; run on login. */
export async function pruneAuthTables(): Promise<void> {
  await query('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
  await query('DELETE FROM login_attempts WHERE attempted_at < CURRENT_TIMESTAMP - make_interval(mins => $1)', [LOGIN_WINDOW_MINUTES]);
  await query('DELETE FROM email_tokens WHERE expires_at < CURRENT_TIMESTAMP - interval \'7 days\'');
}

/** End every session for a user, e.g. after a password change or removal. */
export async function revokeSessions(db: Queryable, userId: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}
