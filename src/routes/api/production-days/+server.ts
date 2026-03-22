import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';

interface ProductionDay {
  production_date: string;
  tenant_id: string;
  status: 'active' | 'scheduled' | 'completed';
  created_at: string;
  completed_at: string | null;
}

/**
 * GET /api/production-days
 * List all production days for the tenant
 */
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<ProductionDay>(
    `SELECT production_date::text, status, created_at, completed_at
     FROM production_days
     WHERE tenant_id = $1
     ORDER BY production_date DESC`,
    [locals.tenant.id]
  );

  return json({ days: result.rows });
};

/**
 * POST /api/production-days
 * Create a new production day
 * Body: { production_date: string, status?: 'active' | 'scheduled' }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { production_date, status = 'active' } = await request.json();

    if (!production_date) {
      return json({ error: 'production_date is required' }, { status: 400 });
    }

    // Check if there's already an active day
    if (status === 'active') {
      const activeCheck = await query<ProductionDay>(
        'SELECT production_date FROM production_days WHERE tenant_id = $1 AND status = $2',
        [locals.tenant.id, 'active']
      );

      if (activeCheck.rows.length > 0) {
        return json(
          {
            error: 'Already have an active roast day',
            activeDay: activeCheck.rows[0].production_date
          },
          { status: 409 }
        );
      }
    }

    // Create the production day
    await query(
      'INSERT INTO production_days (production_date, tenant_id, status) VALUES ($1, $2, $3)',
      [production_date, locals.tenant.id, status]
    );

    return json({ success: true, production_date, status });
  } catch (err) {
    console.error('Create production day error:', err);
    return json({ error: 'Failed to create production day' }, { status: 500 });
  }
};
