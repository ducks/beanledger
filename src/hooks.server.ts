import type { Handle } from '@sveltejs/kit';
import { query } from '$lib/db';
import type { User, Tenant } from '$lib/types';
import { runMigrations } from '$lib/migrate';

// Run migrations on startup
runMigrations().catch(err => {
  console.error('Failed to run migrations:', err);
  process.exit(1);
});

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize locals
  event.locals.user = null;
  event.locals.tenant = null;

  // Check for session cookie
  const sessionId = event.cookies.get('session');

  if (sessionId) {
    try {
      // Look up session and join with user and tenant
      const result = await query<User & { tenant_name: string }>(`
        SELECT
          u.id, u.username, u.email, u.tenant_id, u.created_at,
          t.name as tenant_name, t.created_at as tenant_created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        JOIN tenants t ON u.tenant_id = t.id
        WHERE s.id = $1 AND s.expires_at > NOW()
      `, [sessionId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        event.locals.user = {
          id: row.id,
          username: row.username,
          email: row.email,
          tenant_id: row.tenant_id,
          created_at: row.created_at
        };
        event.locals.tenant = {
          id: row.tenant_id,
          name: row.tenant_name,
          created_at: row.tenant_created_at
        };
      } else {
        // Session expired or invalid - clear cookie
        event.cookies.delete('session', { path: '/' });
      }
    } catch (err) {
      console.error('Session lookup error:', err);
      event.cookies.delete('session', { path: '/' });
    }
  }

  return resolve(event);
};
