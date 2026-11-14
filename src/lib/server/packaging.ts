import type pg from 'pg';
import { ValidationError } from './validate';

interface ProductionDayRow {
  status: 'active' | 'scheduled' | 'completed';
}

interface PackagingTypeRow {
  id: string;
  size_grams: number;
  on_hand_count: number;
}

interface RequiredRow {
  packaging_type_id: string;
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
  // Lock catalog rows so assignment edits cannot interleave with completion.
  await client.query(`SELECT p.id FROM products p WHERE p.tenant_id = $1
    AND EXISTS (SELECT 1 FROM orders o WHERE o.product_id = p.id AND o.tenant_id = p.tenant_id AND o.production_date = $2)
    ORDER BY p.id FOR SHARE`, [tenantId, productionDate]);
  const typesResult = await client.query<PackagingTypeRow>(
    'SELECT id, size_grams, on_hand_count FROM packaging_types WHERE tenant_id = $1 AND active = true ORDER BY id FOR UPDATE', [tenantId]);
  const invalid = await client.query(`SELECT 1 FROM orders o JOIN product_packaging p
    ON p.product_id = o.product_id AND p.tenant_id = o.tenant_id
    WHERE o.tenant_id = $1 AND o.production_date = $2 AND p.packaging_mode = 'tracked' AND p.packaging_type_id IS NULL`, [tenantId, productionDate]);
  if (invalid.rows.length) throw new ValidationError('An ordered product uses archived packaging. Choose available packaging in Catalog before completing this day.');
  const requiredResult = await client.query<RequiredRow>(
    `SELECT p.packaging_type_id, SUM(o.qty)::integer AS required_count
     FROM orders o JOIN product_packaging p ON p.product_id = o.product_id AND p.tenant_id = o.tenant_id
     WHERE o.production_date = $1 AND o.tenant_id = $2 AND p.packaging_type_id IS NOT NULL
     GROUP BY p.packaging_type_id`, [productionDate, tenantId]);
  const requiredById = new Map(requiredResult.rows.map(row => [row.packaging_type_id, Number(row.required_count)]));

  for (const packaging of typesResult.rows) {
    const startingCount = Number(packaging.on_hand_count);
    const filledCount = requiredById.get(packaging.id) ?? 0;
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
