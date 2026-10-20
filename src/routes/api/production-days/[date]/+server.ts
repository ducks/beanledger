import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withTransaction } from '$lib/db';
import { commitPackagingUsage, lockProductionDay, reversePackagingUsage } from '$lib/server/packaging';
import { writeCompletionSnapshot } from '$lib/server/snapshot';
import { handle, readBody, requireEnum, paramDate } from '$lib/server/validate';

const STATUSES = ['active', 'scheduled', 'completed'] as const;

/**
 * PATCH { status } moves a day through scheduled → active → completed.
 * Completing a day commits packaging usage and writes the day's snapshot
 * from database state, in one transaction; moving back out of completed
 * reverses the packaging usage (the snapshot stays as history until the
 * day is completed again, which rewrites it).
 */
export const PATCH: RequestHandler = async ({ request, params, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Update production day', async () => {
    const date = paramDate(params.date, 'date');
    const status = requireEnum(await readBody(request), 'status', STATUSES);

    const result = await withTransaction(async (client) => {
      const day = await lockProductionDay(client, tenantId, date);
      if (!day) return { kind: 'not-found' as const };

      if (day.status !== 'completed' && status === 'completed') {
        await commitPackagingUsage(client, tenantId, date);
        await writeCompletionSnapshot(client, tenantId, date);
      } else if (day.status === 'completed' && status !== 'completed') {
        await reversePackagingUsage(client, tenantId, date);
      }

      if (day.status !== status) {
        try {
          await client.query(
            `UPDATE production_days
             SET status = $1,
                 completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END
             WHERE production_date = $2 AND tenant_id = $3`,
            [status, date, tenantId]
          );
        } catch (err) {
          const pgError = err as { code?: string; constraint?: string };
          if (pgError.code === '23505' && pgError.constraint === 'production_days_one_active_idx') {
            const active = await client.query<{ production_date: string }>(
              "SELECT production_date::text FROM production_days WHERE tenant_id = $1 AND status = 'active'",
              [tenantId]
            );
            return { kind: 'active-conflict' as const, activeDay: active.rows[0]?.production_date };
          }
          throw err;
        }
      }
      return { kind: 'success' as const };
    });

    if (result.kind === 'not-found') return json({ error: 'Roast day not found' }, { status: 404 });
    if (result.kind === 'active-conflict') {
      return json({ error: 'Already have an active roast day', activeDay: result.activeDay }, { status: 409 });
    }
    return json({ success: true });
  });
};

/** DELETE removes the day and everything that belongs to it: its orders,
 *  import records, packaging usage, and snapshot. Recreating the date
 *  starts empty rather than resurrecting old orders. */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Delete production day', async () => {
    const date = paramDate(params.date, 'date');
    const deleted = await withTransaction(async (client) => {
      const day = await lockProductionDay(client, tenantId, date);
      if (!day) return false;
      if (day.status === 'completed') {
        await reversePackagingUsage(client, tenantId, date);
      }
      await client.query('DELETE FROM orders WHERE production_date = $1 AND tenant_id = $2', [date, tenantId]);
      await client.query('DELETE FROM imports WHERE production_date = $1 AND tenant_id = $2', [date, tenantId]);
      await client.query('DELETE FROM production_summaries WHERE production_date = $1 AND tenant_id = $2', [date, tenantId]);
      await client.query('DELETE FROM production_days WHERE production_date = $1 AND tenant_id = $2', [date, tenantId]);
      return true;
    });
    if (!deleted) return json({ error: 'Roast day not found' }, { status: 404 });
    return json({ success: true });
  });
};
