import type { PoolClient } from 'pg';
import type { Bundle, BundleRevision } from '$lib/bundles';
import { query } from '$lib/db';

export async function loadBundles(tenantId: string, client?: PoolClient): Promise<Bundle[]> {
  const run = client ? client.query.bind(client) : query;
  const bundles = await run('SELECT * FROM bundles WHERE tenant_id = $1 ORDER BY name', [tenantId]);
  const revisions = await run(`SELECT r.*, r.cycle_start::text,
    (SELECT count(*)::int FROM bundle_import_lines l WHERE l.revision_id=r.id AND l.tenant_id=r.tenant_id) AS imported_lines
    FROM bundle_revisions r WHERE r.tenant_id=$1 ORDER BY r.created_at DESC, r.id DESC`, [tenantId]);
  const usage = await run(`SELECT l.bundle_id, o.product_id, c->>'name' AS name,
    sum(o.qty)::int AS bag_count, max(o.production_date)::text AS last_production_date
    FROM orders o JOIN bundle_import_lines l ON l.id=o.bundle_line_id AND l.tenant_id=o.tenant_id
    CROSS JOIN LATERAL jsonb_array_elements(l.snapshot->'components') c
    WHERE o.tenant_id=$1 AND c->>'product_id'=o.product_id
    GROUP BY l.bundle_id,o.product_id,c->>'name' ORDER BY last_production_date DESC,name`, [tenantId]);
  return bundles.rows.map(b => ({ ...b, imported_usage: usage.rows.filter(u=>u.bundle_id===b.id), revisions: revisions.rows.filter(r => r.bundle_id === b.id) as BundleRevision[] })) as Bundle[];
}
