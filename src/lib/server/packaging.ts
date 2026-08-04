import type pg from 'pg';

interface ProductionDayRow {
  status: 'active' | 'scheduled' | 'completed';
}

interface PackagingTypeRow {
  id: string;
  size_oz: number;
  on_hand_count: number;
}

interface RequiredRow {
  size_oz: number;
  required_count: number;
}

interface UsageRow {
  packaging_type_id: string;
  filled_count: number;
}

export async function lockProductionDay(
  client: pg.PoolClient,
  tenantId: string,
  productionDate: string
): Promise<ProductionDayRow | null> {
  const result = await client.query<ProductionDayRow>(
    `SELECT status
     FROM production_days
     WHERE production_date = $1 AND tenant_id = $2
     FOR UPDATE`,
    [productionDate, tenantId]
  );
  return result.rows[0] ?? null;
}

export async function commitPackagingUsage(
  client: pg.PoolClient,
  tenantId: string,
  productionDate: string
): Promise<void> {
  const [typesResult, requiredResult] = await Promise.all([
    client.query<PackagingTypeRow>(
      `SELECT id, size_oz, on_hand_count
       FROM packaging_types
       WHERE tenant_id = $1 AND active = true
       ORDER BY size_oz
       FOR UPDATE`,
      [tenantId]
    ),
    client.query<RequiredRow>(
      `SELECT ROUND(p.lbs * 16)::integer AS size_oz,
              SUM(o.qty)::integer AS required_count
       FROM orders o
       JOIN products p
         ON p.id = o.product_id AND p.tenant_id = o.tenant_id
       WHERE o.production_date = $1 AND o.tenant_id = $2
       GROUP BY ROUND(p.lbs * 16)::integer`,
      [productionDate, tenantId]
    )
  ]);

  const requiredBySize = new Map<number, number>(
    requiredResult.rows.map((row: RequiredRow) => [
      Number(row.size_oz),
      Number(row.required_count)
    ])
  );

  for (const packaging of typesResult.rows) {
    const startingCount = Number(packaging.on_hand_count);
    const filledCount = requiredBySize.get(Number(packaging.size_oz)) ?? 0;
    const endingCount = startingCount - filledCount;

    await client.query(
      `INSERT INTO packaging_usage (
         production_date, packaging_type_id, starting_count,
         filled_count, ending_count, tenant_id
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [productionDate, packaging.id, startingCount, filledCount, endingCount, tenantId]
    );
    await client.query(
      `UPDATE packaging_types
       SET on_hand_count = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [endingCount, packaging.id, tenantId]
    );
  }
}

export async function reversePackagingUsage(
  client: pg.PoolClient,
  tenantId: string,
  productionDate: string
): Promise<void> {
  const usage = await client.query<UsageRow>(
    `SELECT packaging_type_id, filled_count
     FROM packaging_usage
     WHERE production_date = $1 AND tenant_id = $2
     FOR UPDATE`,
    [productionDate, tenantId]
  );

  for (const row of usage.rows) {
    await client.query(
      `UPDATE packaging_types
       SET on_hand_count = on_hand_count + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [Number(row.filled_count), row.packaging_type_id, tenantId]
    );
  }

  await client.query(
    `DELETE FROM packaging_usage
     WHERE production_date = $1 AND tenant_id = $2`,
    [productionDate, tenantId]
  );
}
