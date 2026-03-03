import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import type { BatchOverride } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await query<BatchOverride>(
    'SELECT * FROM batch_overrides WHERE tenant_id = $1',
    [locals.tenant.id]
  );
  return json(result.rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const override: BatchOverride = await request.json();

  // Note: Schema has batch_type as PRIMARY KEY (should be composite with tenant_id)
  // Using DELETE + INSERT as workaround until schema is fixed
  await query(
    'DELETE FROM batch_overrides WHERE batch_type = $1 AND tenant_id = $2',
    [override.batch_type, locals.tenant.id]
  );

  const result = await query(
    `INSERT INTO batch_overrides (batch_type, weight_lbs, tenant_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [override.batch_type, override.weight_lbs, locals.tenant.id]
  );

  return json(result.rows[0], { status: 201 });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const batch_type = url.searchParams.get('batch_type');
  if (!batch_type) {
    return json({ error: 'Missing batch_type' }, { status: 400 });
  }

  await query(
    'DELETE FROM batch_overrides WHERE batch_type = $1 AND tenant_id = $2',
    [batch_type, locals.tenant.id]
  );
  return json({ success: true });
};
