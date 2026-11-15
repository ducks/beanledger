import { query } from '$lib/db';
import { normalizedCatalogName } from '$lib/catalog-duplicates';

export async function matchingProductNames(tenantId: string, name: string, excludeId?: string) {
  const rows = await query<{id:string;name:string;active:boolean}>('SELECT id, name, active FROM products WHERE tenant_id = $1', [tenantId]);
  return rows.rows.filter(p => p.id !== excludeId && normalizedCatalogName(p.name) === normalizedCatalogName(name));
}
