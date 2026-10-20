import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { handle, readBody, requireDate, requireEnum } from '$lib/server/validate';

interface ProductionDay {
  production_date: string;
  status: 'active' | 'scheduled' | 'completed';
  created_at: string;
  completed_at: string | null;
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const result = await query<ProductionDay>(
    `SELECT production_date::text, status, created_at, completed_at
     FROM production_days
     WHERE tenant_id = $1
     ORDER BY production_date DESC`,
    [locals.tenant.id]
  );
  return json({ days: result.rows });
};

/** POST { production_date, status? } creates a day. One active day per
 *  tenant is enforced by a partial unique index, so a race between two
 *  requests cannot produce two. */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Create production day', async () => {
    const body = await readBody(request);
    const productionDate = requireDate(body, 'production_date');
    const status = body.status === undefined ? 'active' : requireEnum(body, 'status', ['active', 'scheduled'] as const);
    try {
      await query(
        'INSERT INTO production_days (production_date, tenant_id, status) VALUES ($1, $2, $3)',
        [productionDate, tenantId, status]
      );
    } catch (err) {
      const pgError = err as { code?: string; constraint?: string };
      if (pgError.code === '23505' && pgError.constraint === 'production_days_one_active_idx') {
        const active = await query<ProductionDay>(
          "SELECT production_date::text FROM production_days WHERE tenant_id = $1 AND status = 'active'",
          [tenantId]
        );
        return json(
          { error: 'Already have an active roast day', activeDay: active.rows[0]?.production_date },
          { status: 409 }
        );
      }
      if (pgError.code === '23505') {
        return json({ error: 'A roast day already exists for that date' }, { status: 409 });
      }
      throw err;
    }
    return json({ success: true, production_date: productionDate, status });
  });
};
