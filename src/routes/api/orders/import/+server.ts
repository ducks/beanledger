import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '$lib/db';
import { parseOrderCsv, matchProducts, generateOrderId } from '$lib/csv';
import type { Product } from '$lib/types';

/**
 * POST /api/orders/import
 *
 * Body:
 * - csvText: string
 * - productionDate: string (YYYY-MM-DD)
 * - filename: string (optional, for tracking)
 * - confirm: boolean (if true, create orders; if false, just preview)
 *
 * Returns:
 * - matches: array of match results
 * - created: number of orders created (if confirmed)
 * - importId: UUID of the import batch (if confirmed)
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { csvText, productionDate, filename, confirm } = await request.json();

    if (!csvText || !productionDate) {
      return json({ error: 'csvText and productionDate are required' }, { status: 400 });
    }

    // Parse CSV
    const csvRows = parseOrderCsv(csvText);

    // Fetch all products for this tenant
    const productsResult = await query<Product>(
      'SELECT * FROM products WHERE tenant_id = $1 AND active = true',
      [locals.tenant.id]
    );
    const products = productsResult.rows;

    // Match CSV rows to products
    const matches = matchProducts(csvRows, products);

    // If not confirming, just return preview
    if (!confirm) {
      return json({
        matches,
        unmatched: matches.filter(m => m.confidence === 'none').length,
        total: matches.length
      });
    }

    // Create import batch record
    const importId = `import-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await query(
      'INSERT INTO imports (id, filename, production_date, tenant_id) VALUES ($1, $2, $3, $4)',
      [importId, filename || 'unknown.csv', productionDate, locals.tenant.id]
    );

    // Create orders for matched products (not additive - each import is separate)
    let created = 0;
    for (const match of matches) {
      if (match.matchedProduct) {
        // Create new order with import_batch_id
        const orderId = generateOrderId();
        await query(
          'INSERT INTO orders (id, product_id, qty, production_date, tenant_id, import_batch_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [orderId, match.matchedProduct.id, match.quantity, productionDate, locals.tenant.id, importId]
        );
        created++;
      }
    }

    // Update import record with order count
    await query(
      'UPDATE imports SET order_count = $1 WHERE id = $2',
      [created, importId]
    );

    return json({
      matches,
      created,
      importId,
      unmatched: matches.filter(m => m.confidence === 'none').length,
      total: matches.length
    });
  } catch (err) {
    console.error('CSV import error:', err);
    return json({ error: err instanceof Error ? err.message : 'Import failed' }, { status: 500 });
  }
};
