import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
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

function normalize(row: PackagingRow): PackagingType {
  const requiredCount = Number(row.required_count ?? 0);
  const filledCount = Number(row.filled_count ?? 0);
  const onHandCount = Number(row.on_hand_count);
  return {
    ...row,
    size_oz: Number(row.size_oz),
    on_hand_count: onHandCount,
    required_count: requiredCount,
    projected_remaining: onHandCount - requiredCount,
    starting_count: row.starting_count == null ? null : Number(row.starting_count),
    filled_count: filledCount,
    ending_count: row.ending_count == null ? null : Number(row.ending_count)
  };
}

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = url.searchParams.get('date');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  if (date) {
    const [typesResult, untrackedResult, dayResult] = await Promise.all([
      query<PackagingRow>(
        `WITH required AS (
           SELECT ROUND(p.lbs * 16)::integer AS size_oz,
                  SUM(o.qty)::integer AS required_count
           FROM orders o
           JOIN products p
             ON p.id = o.product_id AND p.tenant_id = o.tenant_id
           WHERE o.production_date = $1 AND o.tenant_id = $2
           GROUP BY ROUND(p.lbs * 16)::integer
         )
         SELECT pt.*,
                COALESCE(r.required_count, 0) AS required_count,
                pu.starting_count,
                COALESCE(pu.filled_count, 0) AS filled_count,
                pu.ending_count
         FROM packaging_types pt
         LEFT JOIN required r ON r.size_oz = pt.size_oz
         LEFT JOIN packaging_usage pu
           ON pu.packaging_type_id = pt.id
          AND pu.tenant_id = pt.tenant_id
          AND pu.production_date = $1
         WHERE pt.tenant_id = $2
           AND (pt.active = true OR pu.packaging_type_id IS NOT NULL)
         ORDER BY pt.size_oz`,
        [date, locals.tenant.id]
      ),
      query<UntrackedPackagingRequirement>(
        `SELECT required.size_oz, required.required_count
         FROM (
           SELECT ROUND(p.lbs * 16)::integer AS size_oz,
                  SUM(o.qty)::integer AS required_count
           FROM orders o
           JOIN products p
             ON p.id = o.product_id AND p.tenant_id = o.tenant_id
           WHERE o.production_date = $1 AND o.tenant_id = $2
           GROUP BY ROUND(p.lbs * 16)::integer
         ) required
         WHERE NOT EXISTS (
           SELECT 1 FROM packaging_types pt
           WHERE pt.tenant_id = $2
             AND pt.active = true
             AND pt.size_oz = required.size_oz
         )
         ORDER BY required.size_oz`,
        [date, locals.tenant.id]
      ),
      query<{ status: string }>(
        `SELECT status FROM production_days
         WHERE production_date = $1 AND tenant_id = $2`,
        [date, locals.tenant.id]
      )
    ]);

    return json({
      packaging: typesResult.rows.map(normalize),
      untracked: untrackedResult.rows.map((row: UntrackedPackagingRequirement) => ({
        size_oz: Number(row.size_oz),
        required_count: Number(row.required_count)
      })),
      day_status: dayResult.rows[0]?.status ?? null
    });
  }

  if (dateFrom || dateTo) {
    const conditions = ['o.tenant_id = $1'];
    const usageConditions = ['pu.tenant_id = $1'];
    const params: unknown[] = [locals.tenant.id];
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`o.production_date >= $${params.length}`);
      usageConditions.push(`pu.production_date >= $${params.length}`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`o.production_date <= $${params.length}`);
      usageConditions.push(`pu.production_date <= $${params.length}`);
    }

    const result = await query<PackagingRow>(
      `WITH required AS (
         SELECT ROUND(p.lbs * 16)::integer AS size_oz,
                SUM(o.qty)::integer AS required_count
         FROM orders o
         JOIN products p
           ON p.id = o.product_id AND p.tenant_id = o.tenant_id
         WHERE ${conditions.join(' AND ')}
         GROUP BY ROUND(p.lbs * 16)::integer
       ), usage AS (
         SELECT pu.packaging_type_id,
                SUM(pu.filled_count)::integer AS filled_count,
                (ARRAY_AGG(pu.starting_count ORDER BY pu.production_date))[1] AS starting_count,
                (ARRAY_AGG(pu.ending_count ORDER BY pu.production_date DESC))[1] AS ending_count
         FROM packaging_usage pu
         WHERE ${usageConditions.join(' AND ')}
         GROUP BY pu.packaging_type_id
       )
       SELECT pt.*, COALESCE(r.required_count, 0) AS required_count,
              u.starting_count, COALESCE(u.filled_count, 0) AS filled_count,
              u.ending_count
       FROM packaging_types pt
       LEFT JOIN required r ON r.size_oz = pt.size_oz
       LEFT JOIN usage u ON u.packaging_type_id = pt.id
       WHERE pt.tenant_id = $1
         AND (pt.active = true OR u.packaging_type_id IS NOT NULL)
       ORDER BY pt.size_oz`,
      params
    );
    return json({ packaging: result.rows.map(normalize), untracked: [], day_status: 'range' });
  }

  const result = await query<PackagingRow>(
    `SELECT pt.*, 0 AS required_count, NULL::integer AS starting_count,
            0 AS filled_count, NULL::integer AS ending_count
     FROM packaging_types pt
     WHERE tenant_id = $1 AND active = true
     ORDER BY size_oz`,
    [locals.tenant.id]
  );
  return json({ packaging: result.rows.map(normalize), untracked: [], day_status: null });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const sizeOz = integer(body.size_oz);
  const onHandCount = integer(body.on_hand_count);
  if (!label || sizeOz === null || sizeOz <= 0 || onHandCount === null || onHandCount < 0) {
    return json({ error: 'Label, positive whole-ounce size, and non-negative count are required' }, { status: 400 });
  }

  const result = await query<PackagingType>(
    `INSERT INTO packaging_types (label, size_oz, on_hand_count, tenant_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, size_oz) DO UPDATE
       SET label = EXCLUDED.label,
           on_hand_count = EXCLUDED.on_hand_count,
           active = true,
           updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [label, sizeOz, onHandCount, locals.tenant.id]
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
