import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { handle, paramDate } from '$lib/server/validate';
import type { PackagingType, UntrackedPackagingRequirement } from '$lib/types';

type PackagingRow = Omit<
  PackagingType,
  'required_count' | 'filled_count' | 'starting_count' | 'ending_count'
> & {
  required_count: number | string | null;
  filled_count: number | string | null;
  starting_count: number | string | null;
  ending_count: number | string | null;
};

function integer(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeCapacity(value: unknown, unit: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const grams = unit === 'g'
    ? Math.round(parsed)
    : unit === 'oz'
      ? Math.round(parsed * 28.349523125)
      : 0;
  return grams > 0 ? grams : null;
}

function normalize(row: PackagingRow): PackagingType {
  const requiredCount = Number(row.required_count ?? 0);
  const filledCount = Number(row.filled_count ?? 0);
  const onHandCount = Number(row.on_hand_count);
  return {
    ...row,
    size_grams: Number(row.size_grams),
    on_hand_count: onHandCount,
    required_count: requiredCount,
    projected_remaining: onHandCount - requiredCount,
    starting_count: row.starting_count == null ? null : Number(row.starting_count),
    filled_count: filledCount,
    ending_count: row.ending_count == null ? null : Number(row.ending_count)
  };
}

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Read packaging', async () => {
    const date = url.searchParams.get('date');
    const from = date ?? url.searchParams.get('dateFrom');
    const to = date ?? url.searchParams.get('dateTo');
    const includeOrders = Boolean(from || to);
    const params = [tenantId, from ? paramDate(from, 'dateFrom') : null, to ? paramDate(to, 'dateTo') : null, includeOrders];
    // Completed-day counts come only from the committed ledger. Current catalog
    // choices apply to open days, never retroactively to completed production.
    const result = await query<PackagingRow>(`
      WITH required AS (
        SELECT p.packaging_type_id, SUM(o.qty)::integer AS required_count
        FROM orders o JOIN product_packaging p ON p.product_id = o.product_id AND p.tenant_id = o.tenant_id
        LEFT JOIN production_days pd ON pd.tenant_id = o.tenant_id AND pd.production_date = o.production_date
        WHERE o.tenant_id = $1 AND $4 AND ($2::date IS NULL OR o.production_date >= $2)
          AND ($3::date IS NULL OR o.production_date <= $3)
          AND pd.status IS DISTINCT FROM 'completed' AND p.packaging_type_id IS NOT NULL
        GROUP BY p.packaging_type_id
      ), usage AS (
        SELECT pu.packaging_type_id, SUM(pu.filled_count)::integer AS filled_count,
          (ARRAY_AGG(pu.starting_count ORDER BY pu.production_date))[1] AS starting_count,
          (ARRAY_AGG(pu.ending_count ORDER BY pu.production_date DESC))[1] AS ending_count
        FROM packaging_usage pu WHERE pu.tenant_id = $1 AND $4
          AND ($2::date IS NULL OR pu.production_date >= $2) AND ($3::date IS NULL OR pu.production_date <= $3)
        GROUP BY pu.packaging_type_id
      ) SELECT pt.*, COALESCE(r.required_count, 0) + COALESCE(u.filled_count, 0) AS required_count,
          u.starting_count, COALESCE(u.filled_count, 0) AS filled_count, u.ending_count
        FROM packaging_types pt LEFT JOIN required r ON r.packaging_type_id = pt.id
        LEFT JOIN usage u ON u.packaging_type_id = pt.id
        WHERE pt.tenant_id = $1 AND (pt.active OR u.packaging_type_id IS NOT NULL)
        ORDER BY pt.size_grams`, params);
    const untracked = includeOrders ? await query<UntrackedPackagingRequirement>(`
      SELECT p.size_grams, SUM(o.qty)::integer AS required_count
      FROM orders o JOIN product_packaging p ON p.product_id = o.product_id AND p.tenant_id = o.tenant_id
      LEFT JOIN production_days pd ON pd.tenant_id = o.tenant_id AND pd.production_date = o.production_date
      WHERE o.tenant_id = $1 AND $4 AND ($2::date IS NULL OR o.production_date >= $2)
        AND ($3::date IS NULL OR o.production_date <= $3) AND pd.status IS DISTINCT FROM 'completed'
        AND p.packaging_type_id IS NULL AND p.packaging_mode <> 'untracked'
      GROUP BY p.size_grams ORDER BY p.size_grams`, params) : { rows: [] };
    const day = date ? await query<{status:string}>('SELECT status FROM production_days WHERE tenant_id = $1 AND production_date = $2', [tenantId, date]) : null;
    const status = date ? day?.rows[0]?.status ?? null : includeOrders ? 'range' : null;
    return json({
      packaging: result.rows.map(row => {
        const item = normalize(row);
        // Committed counts have already been deducted from current stock.
        item.projected_remaining = item.on_hand_count - (Number(row.required_count) - Number(row.filled_count ?? 0));
        return item;
      }),
      untracked: untracked.rows.map(row => ({size_grams:Number(row.size_grams), required_count:Number(row.required_count)})),
      day_status: status
    });
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const sizeGrams = normalizeCapacity(body.size_value, body.size_unit);
  const onHandCount = integer(body.on_hand_count);
  if (!label || sizeGrams === null || onHandCount === null || onHandCount < 0) {
    return json({ error: 'Label, positive capacity in ounces or grams, and non-negative count are required' }, { status: 400 });
  }

  const result = await query<PackagingType>(
    `INSERT INTO packaging_types (label, size_grams, on_hand_count, tenant_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, size_grams) DO UPDATE
       SET label = EXCLUDED.label,
           on_hand_count = EXCLUDED.on_hand_count,
           active = true,
           updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [label, sizeGrams, onHandCount, locals.tenant.id]
  );
  return json(normalize(result.rows[0] as PackagingRow), { status: 201 });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const onHandCount = integer(body.on_hand_count);
  if (!body.id || !label || onHandCount === null || onHandCount < 0) {
    return json({ error: 'Packaging id, label, and non-negative count are required' }, { status: 400 });
  }

  const result = await query<PackagingType>(
    `UPDATE packaging_types
     SET label = $1, on_hand_count = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND tenant_id = $4
     RETURNING *`,
    [label, onHandCount, body.id, locals.tenant.id]
  );
  if (!result.rows[0]) return json({ error: 'Packaging type not found' }, { status: 404 });
  return json(result.rows[0]);
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, { status: 400 });

  const result = await query(
    `UPDATE packaging_types
     SET active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2
     RETURNING id`,
    [id, locals.tenant.id]
  );
  if (!result.rows[0]) return json({ error: 'Packaging type not found' }, { status: 404 });
  return json({ success: true });
};
