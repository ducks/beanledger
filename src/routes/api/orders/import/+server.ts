import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHash } from 'node:crypto';
import { withTransaction } from '$lib/db';
import { parseOrderCsv, matchProducts, type CsvRow, type MatchResult } from '$lib/csv';
import { parseWithConfigDetails, type NameChange } from '$lib/csv/formats/generic';
import { newId } from '$lib/server/ids';
import { loadBundles } from '$lib/server/bundles';
import { bundleNameKey, revisionFor, expandBundle, type BundleSnapshot } from '$lib/bundles';
import { handle, readBody, requireString, requireDate, optionalId, optionalString, ValidationError } from '$lib/server/validate';
import type { Product, ImportAlias, CsvFormat } from '$lib/types';

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Import orders', async () => {
    const body = await readBody(request);
    const csvText = requireString(body, 'csvText', MAX_CSV_BYTES);
    const productionDate = requireDate(body, 'productionDate');
    const bundleHandling = body.bundleHandling === 'components' ? 'components' : 'expand';
    const filename = optionalString(body, 'filename', 255) ?? 'unknown.csv';
    const formatId = optionalId(body, 'formatId');
    const manualMatches = body.manualMatches && typeof body.manualMatches === 'object' && !Array.isArray(body.manualMatches)
      ? body.manualMatches as Record<string, unknown> : {};

    return withTransaction(async client => {
      // Saves lock the parent bundle; hold a shared lock through expansion and insertion.
      await client.query('SELECT id FROM bundles WHERE tenant_id=$1 ORDER BY id FOR SHARE', [tenantId]);
      const bundles = await loadBundles(tenantId, client);
      let csvRows: CsvRow[];
      let sourceRecords: NameChange[];
      let nameChanges: NameChange[] = [];
      let aggregate = false;
      if (formatId) {
        const formats = await client.query<CsvFormat>('SELECT config FROM csv_formats WHERE id=$1 AND tenant_id=$2 AND active=true FOR SHARE', [formatId,tenantId]);
        if (!formats.rows.length) throw new ValidationError('CSV format not found');
        const config = formats.rows[0].config;
        aggregate = config.aggregate === true;
        try {
          const parsed = parseWithConfigDetails(csvText, {...config, aggregate:false}, true);
          csvRows = parsed.rows;
          sourceRecords = parsed.names;
          nameChanges = parsed.names.filter(r => r.original !== r.cleaned);
        } catch (err) {
          if (err instanceof Error) throw new ValidationError(err.message);
          throw err;
        }
      } else {
        csvRows = parseOrderCsv(csvText);
        sourceRecords = csvRows.map((r,i)=>({record:i+2,original:r.productName,cleaned:r.productName,quantity:r.quantity}));
      }
      const products = (await client.query<Product>(`SELECT p.* FROM products p JOIN roast_groups g ON g.id=p.group_id AND g.tenant_id=p.tenant_id
        WHERE p.tenant_id=$1 AND p.active AND g.active FOR SHARE OF p,g`, [tenantId])).rows;
      const aliases = (await client.query<ImportAlias>('SELECT * FROM import_aliases WHERE tenant_id=$1 AND active=true FOR SHARE', [tenantId])).rows;
      const bundleLines: BundleSnapshot[] = [];
      const skippedBundles: {record:number;name:string}[] = [];
      const bundleErrors: {record:number; name:string; error:string}[] = [];
      const bundleNames = new Set(bundles.map(b=>bundleNameKey(b.name)));
      for (const row of sourceRecords) {
        const bundle = bundles.find(b=>bundleNameKey(b.name)===bundleNameKey(row.cleaned));
        if (!bundle) continue;
        if (bundleHandling === 'components') { skippedBundles.push({record:row.record,name:row.cleaned}); continue; }
        try {
          if (!bundle.active) throw new Error('This bundle is archived. Restore it in Catalog → Bundles.');
          if (!formatId) throw new Error('Choose a saved CSV format for bundle imports so original records are preserved.');
          if (products.some(p=>bundleNameKey(p.name)===bundleNameKey(row.cleaned)) || aliases.some(a=>bundleNameKey(a.alias_name)===bundleNameKey(row.cleaned))) {
            throw new Error('This name also matches a product or alias. Remove the conflicting mapping before importing.');
          }
          const revision = revisionFor(bundle, productionDate);
          if (!revision) throw new Error('No contents are configured for this production date. Set the lineup in Catalog → Bundles.');
          const components = expandBundle(bundle, revision, row.quantity, products);
          bundleLines.push({bundle_id:bundle.id,name:bundle.name,revision_id:revision.id,cycle_start:revision.cycle_start,
            quantity_mode:bundle.quantity_mode,source_name:row.original,source_record:row.record,source_quantity:row.quantity,components});
        } catch (err) {
          bundleErrors.push({record:row.record,name:row.cleaned,error:err instanceof Error ? err.message : 'Invalid bundle'});
        }
      }
      let plainRows = csvRows.filter(r=>!bundleNames.has(bundleNameKey(r.productName)));
      if (aggregate) {
        const tally = new Map<string,number>();
        for (const row of plainRows) tally.set(row.productName,(tally.get(row.productName)??0)+row.quantity);
        plainRows = [...tally].map(([productName,quantity])=>({productName,quantity}));
      }
      const plainMatches = matchProducts(plainRows,products,aliases).map(match=>{
        const id = manualMatches[match.productName];
        const product = typeof id === 'string' ? products.find(p=>p.id===id) : undefined;
        return product ? {...match,matchedProduct:product,confidence:'exact' as const} : match;
      });
      const expandedMatches: MatchResult[] = bundleLines.flatMap(line=>line.components.map(c=>({
        productName:`${line.name} · record ${line.source_record} → ${c.name}`, quantity:c.quantity,
        matchedProduct:products.find(p=>p.id===c.product_id)!,confidence:'exact'
      })));
      const matches = [...plainMatches,...expandedMatches];
      const unmatched = plainMatches.filter(m=>!m.matchedProduct).length;
      // Confirmation must reproduce the displayed expansion, including current product sizes.
      const bundlePreviewToken = createHash('sha256').update(JSON.stringify({tenantId,csvText,productionDate,formatId,bundleHandling,bundleLines,skippedBundles})).digest('hex');
      const response = {matches,unmatched,total:matches.length,nameChanges,bundleLines,bundleErrors,bundlePreviewToken,skippedBundles};
      if (body.confirm !== true) return json(response);
      if (bundleErrors.length) throw new ValidationError('Resolve every bundle issue and preview again before importing.');
      if ((bundleLines.length || skippedBundles.length) && body.bundlePreviewToken !== bundlePreviewToken) return json({error:'Bundle contents or import input changed. Preview again before importing.'},{status:409});
      const importId = newId('import');
      const matched = plainMatches.filter(m=>m.matchedProduct);
      const created = matched.length + expandedMatches.length;
      await client.query('INSERT INTO imports (id,filename,production_date,tenant_id,order_count) VALUES ($1,$2,$3,$4,$5)',
        [importId,filename,productionDate,tenantId,created]);
      for (const match of matched) {
        await client.query('INSERT INTO orders (id,product_id,qty,production_date,tenant_id,import_batch_id) VALUES ($1,$2,$3,$4,$5,$6)',
          [newId('ord'),match.matchedProduct!.id,match.quantity,productionDate,tenantId,importId]);
      }
      for (const line of bundleLines) {
        const id = newId('bline');
        await client.query(`INSERT INTO bundle_import_lines (id,tenant_id,import_id,bundle_id,revision_id,source_record,source_name,source_quantity,snapshot)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id,tenantId,importId,line.bundle_id,line.revision_id,line.source_record,line.source_name,line.source_quantity,JSON.stringify(line)]);
        for (const c of line.components) {
          await client.query('INSERT INTO orders (id,product_id,qty,production_date,tenant_id,import_batch_id,bundle_line_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [newId('ord'),c.product_id,c.quantity,productionDate,tenantId,importId,id]);
        }
      }
      return json({...response,created,importId});
    });
  });
};
