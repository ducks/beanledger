import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { handle, readBody, requireString, requireNumber, paramId } from '$lib/server/validate';
import type { BatchOverride } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const result = await query<BatchOverride>(
    'SELECT * FROM batch_overrides WHERE tenant_id = $1 ORDER BY batch_type',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Save batch type', async () => {
    const body = await readBody(request);
    const result = await query(
      `INSERT INTO batch_overrides (batch_type, weight_lbs, tenant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (batch_type, tenant_id) DO UPDATE SET weight_lbs = EXCLUDED.weight_lbs
       RETURNING *`,
      [requireString(body, 'batch_type', 64).toLowerCase(), requireNumber(body, 'weight_lbs', { min: 0.1, max: 10000 }), tenantId]
    );
    return json(result.rows[0], { status: 201 });
  });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Delete batch type', async () => {
    const batchType = paramId(url.searchParams.get('batch_type'), 'batch_type');
    await query('DELETE FROM batch_overrides WHERE batch_type = $1 AND tenant_id = $2', [batchType, tenantId]);
    return json({ success: true });
  });
};
