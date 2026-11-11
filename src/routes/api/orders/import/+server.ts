import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query, withTransaction } from '$lib/db';
import { parseOrderCsv, matchProducts } from '$lib/csv';
import { parseWithConfig } from '$lib/csv/formats/generic';
import { newId } from '$lib/server/ids';
import { handle, readBody, requireString, requireDate, optionalId, optionalString, ValidationError } from '$lib/server/validate';
import type { Product, ImportAlias, CsvFormat } from '$lib/types';

const MAX_CSV_BYTES = 2 * 1024 * 1024;

/**
 * POST /api/orders/import
 *
 * Body: { csvText, productionDate, filename?, confirm?, manualMatches?, formatId? }
 * Without `confirm` returns the match preview. With it, creates the import
 * record and every matched order in one transaction: an import either
 * lands whole or not at all, and its order_count is always right.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Import orders', async () => {
    const body = await readBody(request);
    const csvText = requireString(body, 'csvText', MAX_CSV_BYTES);
    const productionDate = requireDate(body, 'productionDate');
    const filename = optionalString(body, 'filename', 255) ?? 'unknown.csv';
    const formatId = optionalId(body, 'formatId');
    const manualMatches =
      body.manualMatches && typeof body.manualMatches === 'object' && !Array.isArray(body.manualMatches)
        ? (body.manualMatches as Record<string, unknown>)
        : {};

    let csvRows;
    if (formatId) {
      const formatResult = await query<CsvFormat>(
        'SELECT config FROM csv_formats WHERE id = $1 AND tenant_id = $2 AND active = true',
        [formatId, tenantId]
      );
      if (formatResult.rows.length === 0) throw new ValidationError(`CSV format not found: ${formatId}`);
      csvRows = parseWithConfig(csvText, formatResult.rows[0].config);
    } else {
      // Legacy auto-detect, kept until every tenant has a saved format.
      csvRows = parseOrderCsv(csvText);
    }

    const [productsResult, aliasesResult] = await Promise.all([
      query<Product>('SELECT p.* FROM products p JOIN roast_groups g ON g.id = p.group_id AND g.tenant_id = p.tenant_id WHERE p.tenant_id = $1 AND p.active = true AND g.active = true', [tenantId]),
      query<ImportAlias>('SELECT * FROM import_aliases WHERE tenant_id = $1 AND active = true', [tenantId])
    ]);
    const products = productsResult.rows;

    let matches = matchProducts(csvRows, products, aliasesResult.rows);
    matches = matches.map((match) => {
      const manualProductId = manualMatches[match.productName];
      const manualProduct = typeof manualProductId === 'string' ? products.find((p) => p.id === manualProductId) : undefined;
      return manualProduct ? { ...match, matchedProduct: manualProduct, confidence: 'exact' as const } : match;
    });

    const unmatched = matches.filter((m) => m.confidence === 'none').length;
    if (body.confirm !== true) {
      return json({ matches, unmatched, total: matches.length });
    }

    const { importId, created } = await withTransaction(async (client) => {
      const importId = newId('import');
      const matched = matches.filter((m) => m.matchedProduct);
      await client.query(
        'INSERT INTO imports (id, filename, production_date, tenant_id, order_count) VALUES ($1, $2, $3, $4, $5)',
        [importId, filename, productionDate, tenantId, matched.length]
      );
      for (const match of matched) {
        await client.query(
          'INSERT INTO orders (id, product_id, qty, production_date, tenant_id, import_batch_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [newId('ord'), match.matchedProduct!.id, match.quantity, productionDate, tenantId, importId]
        );
      }
      return { importId, created: matched.length };
    });

    return json({ matches, created, importId, unmatched, total: matches.length });
  });
};
