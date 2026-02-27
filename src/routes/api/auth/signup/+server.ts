import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { hashPassword, generateSessionId, getSessionExpiration } from '$lib/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { username, email, password, tenantName } = await request.json();

    // Validation
    if (!username || !email || !password || !tenantName) {
      return json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if username or email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return json({ error: 'Username or email already exists' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create tenant and user in a transaction
    const client = await query('BEGIN');

    try {
      // Create tenant
      const tenantResult = await query(
        'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
        [tenantName]
      );
      const tenantId = tenantResult.rows[0].id;

      // Create user
      const userResult = await query(
        `INSERT INTO users (username, email, password_hash, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, tenant_id, created_at`,
        [username, email, passwordHash, tenantId]
      );
      const user = userResult.rows[0];

      // Create session
      const sessionId = generateSessionId();
      const expiresAt = getSessionExpiration();

      await query(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
        [sessionId, user.id, expiresAt]
      );

      await query('COMMIT');

      // Set session cookie
      cookies.set('session', sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });

      return json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          tenant_id: user.tenant_id,
          created_at: user.created_at
        }
      });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Signup error:', err);
    return json({ error: 'Failed to create account' }, { status: 500 });
  }
};
