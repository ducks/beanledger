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
 * PATCH /api/production-days/[date]
 * Update production day status
 * Body: { status: 'active' | 'scheduled' | 'completed' }
 */
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date } = params;
    const { status } = await request.json();

    if (!status || !['active', 'scheduled', 'completed'].includes(status)) {
      return json({ error: 'Invalid status' }, { status: 400 });
    }

    // If setting to active, check for existing active day
    if (status === 'active') {
      const activeCheck = await query<ProductionDay>(
        'SELECT production_date FROM production_days WHERE tenant_id = $1 AND status = $2 AND production_date != $3',
        [locals.tenant.id, 'active', date]
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

    const completed_at = status === 'completed' ? new Date().toISOString() : null;

    await query(
      `UPDATE production_days
       SET status = $1, completed_at = $2
       WHERE production_date = $3 AND tenant_id = $4`,
      [status, completed_at, date, locals.tenant.id]
    );

    return json({ success: true });
  } catch (err) {
    console.error('Update production day error:', err);
    return json({ error: 'Failed to update production day' }, { status: 500 });
  }
};

/**
 * DELETE /api/production-days/[date]
 * Delete a production day
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date } = params;

    await query(
      'DELETE FROM production_days WHERE production_date = $1 AND tenant_id = $2',
      [date, locals.tenant.id]
    );

    return json({ success: true });
  } catch (err) {
    console.error('Delete production day error:', err);
    return json({ error: 'Failed to delete production day' }, { status: 500 });
  }
};
