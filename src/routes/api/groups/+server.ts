import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, withTransaction } from '$lib/db';
import { newId, today } from '$lib/server/ids';
import {
  handle, readBody, requireString, requireNumber, requireEnum, optionalId, requireId,
  optionalBoolean, optionalDate, paramId
} from '$lib/server/validate';
import type { RoastGroup } from '$lib/types';

const GROUP_TYPES = ['blend', 'single_origin'] as const;

function components(value: unknown): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const result = await query<RoastGroup>(
    'SELECT * FROM roast_groups WHERE tenant_id = $1 ORDER BY created_at DESC',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  return handle('Create group', async () => {
    const body = await readBody(request);
    const id = optionalId(body) ?? newId('group');
    const result = await query(
      `INSERT INTO roast_groups (id, label, batch_type, roast_loss_pct, type, components, active, created_at, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        requireString(body, 'label'),
        requireString(body, 'batch_type', 64),
        requireNumber(body, 'roast_loss_pct', { min: 0, max: 50 }),
        requireEnum(body, 'type', GROUP_TYPES),
        components(body.components),
        optionalBoolean(body, 'active', true),
        optionalDate(body, 'created_at') ?? today(),
        locals.tenant!.id
      ]
    );
    return json(result.rows[0], { status: 201 });
  });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  return handle('Update group', async () => {
    const body = await readBody(request);
    const result = await query(
      `UPDATE roast_groups
       SET label = $2, batch_type = $3, roast_loss_pct = $4,
           type = $5, components = $6, active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $8
       RETURNING *`,
      [
        requireId(body),
        requireString(body, 'label'),
        requireString(body, 'batch_type', 64),
        requireNumber(body, 'roast_loss_pct', { min: 0, max: 50 }),
        requireEnum(body, 'type', GROUP_TYPES),
        components(body.components),
        optionalBoolean(body, 'active', true),
        locals.tenant!.id
      ]
    );
    if (!result.rows[0]) return json({ error: 'Group not found' }, { status: 404 });
    return json(result.rows[0]);
  });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Delete group', async () => {
    const id = paramId(url.searchParams.get('id'), 'id');
    const outcome = await withTransaction(async (client) => {
      const exists = await client.query(
        'SELECT 1 FROM roast_groups WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [id, tenantId]
      );
      if (exists.rows.length === 0) return 'not-found' as const;

      const activeOrders = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM orders o
         JOIN production_days pd
           ON o.production_date = pd.production_date AND o.tenant_id = pd.tenant_id
         WHERE o.product_id IN (SELECT id FROM products WHERE group_id = $1 AND tenant_id = $2)
           AND o.tenant_id = $2 AND pd.status IN ('active', 'scheduled')`,
        [id, tenantId]
      );
      if (parseInt(activeOrders.rows[0].count, 10) > 0) return 'in-use' as const;

      // Orders on completed days are preserved in that day's snapshot.
      await client.query(
        `DELETE FROM orders
         WHERE tenant_id = $2
           AND product_id IN (SELECT id FROM products WHERE group_id = $1 AND tenant_id = $2)`,
        [id, tenantId]
      );
      await client.query('DELETE FROM products WHERE group_id = $1 AND tenant_id = $2', [id, tenantId]);
      await client.query('DELETE FROM leftovers WHERE group_id = $1 AND tenant_id = $2', [id, tenantId]);
      await client.query('DELETE FROM roast_groups WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      return 'deleted' as const;
    });

    if (outcome === 'not-found') return json({ error: 'Group not found' }, { status: 404 });
    if (outcome === 'in-use') {
      return json(
        { error: 'Cannot delete group with products in active or scheduled production days. Remove those orders first or mark the group as inactive instead.' },
        { status: 400 }
      );
    }
    return json({ success: true });
  });
};
