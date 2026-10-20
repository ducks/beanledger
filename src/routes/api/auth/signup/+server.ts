import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, withTransaction } from '$lib/db';
import { hashPassword, generateSessionId } from '$lib/auth';
import { handle, readBody, requireString, ValidationError } from '$lib/server/validate';
import { sendVerificationMail } from '$lib/server/accounts';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  return handle('Signup', async () => {
    const body = await readBody(request);
    const username = requireString(body, 'username', 32);
    const email = requireString(body, 'email', 254).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const tenantName = requireString(body, 'tenantName', 120);

    if (!USERNAME_PATTERN.test(username)) {
      throw new ValidationError('Username must be 3-32 characters of letters, digits, _ . -');
    }
    if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
      throw new ValidationError('Email address is not valid');
    }
    if (password.length < 8 || password.length > 256) {
      throw new ValidationError('Password must be between 8 and 256 characters');
    }

    const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return json({ error: 'Username or email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const sessionId = generateSessionId();

    // Tenant, user, and first session land together or not at all; a
    // failure halfway used to leave an orphan tenant behind.
    const user = await withTransaction(async (client) => {
      const tenant = await client.query<{ id: string }>('INSERT INTO tenants (name) VALUES ($1) RETURNING id', [tenantName]);
      const created = await client.query(
        `INSERT INTO users (username, email, password_hash, tenant_id, role)
         VALUES ($1, $2, $3, $4, 'owner')
         RETURNING id, username, email, tenant_id, role, created_at`,
        [username, email, passwordHash, tenant.rows[0].id]
      );
      await client.query('INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + make_interval(days => 30))', [sessionId, created.rows[0].id]);
      await sendVerificationMail(client, created.rows[0], url.origin);
      return created.rows[0];
    });

    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30
    });

    return json({ user });
  });
};
