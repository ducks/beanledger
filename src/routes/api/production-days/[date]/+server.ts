import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withTransaction } from '$lib/db';
import {
  commitPackagingUsage,
  lockProductionDay,
  reversePackagingUsage
} from '$lib/server/packaging';

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

    const result = await withTransaction(async (client) => {
      const day = await lockProductionDay(client, locals.tenant!.id, date);
      if (!day) return { kind: 'not-found' as const };

      if (status === 'active') {
        const activeCheck = await client.query<ProductionDay>(
          `SELECT production_date
           FROM production_days
           WHERE tenant_id = $1 AND status = 'active' AND production_date != $2`,
          [locals.tenant!.id, date]
        );
        if (activeCheck.rows.length > 0) {
          return {
            kind: 'active-conflict' as const,
            activeDay: activeCheck.rows[0].production_date
          };
        }
      }

      if (day.status !== 'completed' && status === 'completed') {
        await commitPackagingUsage(client, locals.tenant!.id, date);
      } else if (day.status === 'completed' && status !== 'completed') {
        await reversePackagingUsage(client, locals.tenant!.id, date);
      }

      if (day.status !== status) {
        await client.query(
          `UPDATE production_days
           SET status = $1,
               completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END
           WHERE production_date = $2 AND tenant_id = $3`,
          [status, date, locals.tenant!.id]
        );
      }
      return { kind: 'success' as const };
    });

    if (result.kind === 'not-found') {
      return json({ error: 'Roast day not found' }, { status: 404 });
    }
    if (result.kind === 'active-conflict') {
      return json(
        { error: 'Already have an active roast day', activeDay: result.activeDay },
        { status: 409 }
      );
    }

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

    const deleted = await withTransaction(async (client) => {
      const day = await lockProductionDay(client, locals.tenant!.id, date);
      if (!day) return false;
      if (day.status === 'completed') {
        await reversePackagingUsage(client, locals.tenant!.id, date);
      }
      await client.query(
        'DELETE FROM production_days WHERE production_date = $1 AND tenant_id = $2',
        [date, locals.tenant!.id]
      );
      return true;
    });

    if (!deleted) {
      return json({ error: 'Roast day not found' }, { status: 404 });
    }

    return json({ success: true });
  } catch (err) {
    console.error('Delete production day error:', err);
    return json({ error: 'Failed to delete production day' }, { status: 500 });
  }
};
