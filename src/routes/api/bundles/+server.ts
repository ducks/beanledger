import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withTransaction } from '$lib/db';
import { newId } from '$lib/server/ids';
import { loadBundles } from '$lib/server/bundles';
import { cycleStart, nextCycle, type BundleComponent } from '$lib/bundles';
import { handle, readBody, requireString, requireId, requireEnum, requireNumber, optionalBoolean, ValidationError } from '$lib/server/validate';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  return handle('List bundles', async () => json({ bundles: await loadBundles(locals.tenant!.id), current: cycleStart(today), next: nextCycle(today) }));
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Create bundle', async () => {
    const body = await readBody(request);
    try {
      return await withTransaction(async client => {
        const result = await client.query(`INSERT INTO bundles (id,tenant_id,name,contents_mode,quantity_mode)
          VALUES ($1,$2,$3,$4,$5) RETURNING *`, [newId('bundle'), tenantId, requireString(body, 'name'),
          requireEnum(body, 'contents_mode', ['fixed','rotating']), requireEnum(body, 'quantity_mode', ['bags','packs'])]);
        return json(result.rows[0], { status: 201 });
      });
    } catch (err) {
      if ((err as {code?:string}).code === '23505') return json({error:'A bundle already uses that import name.'},{status:409});
      throw err;
    }
  });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  if (!locals.tenant) return json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = locals.tenant.id;
  return handle('Update bundle', async () => {
    const body = await readBody(request);
    return withTransaction(async client => {
      const result = await client.query('SELECT * FROM bundles WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [requireId(body), tenantId]);
      const bundle = result.rows[0];
      if (!bundle) return json({error:'Bundle not found'}, {status:404});
      if (body.active !== undefined) {
        await client.query('UPDATE bundles SET active=$3 WHERE id=$1 AND tenant_id=$2', [bundle.id,tenantId,optionalBoolean(body,'active',true)]);
        return json({success:true});
      }
      let cycle: string | null = null;
      if (bundle.contents_mode === 'rotating') {
        const today = new Date().toISOString().slice(0,10);
        cycle = requireString(body,'cycle_start');
        if (![cycleStart(today),nextCycle(today)].includes(cycle)) throw new ValidationError('Only the current or next cycle can be edited.');
      }
      const latest = await client.query(`SELECT id FROM bundle_revisions WHERE bundle_id=$1 AND tenant_id=$2
        AND cycle_start IS NOT DISTINCT FROM $3::date ORDER BY created_at DESC,id DESC LIMIT 1`, [bundle.id,tenantId,cycle]);
      if ((body.base_revision_id ?? null) !== (latest.rows[0]?.id ?? null)) return json({error:'This lineup changed. Reload it before saving.'},{status:409});
      if (!Array.isArray(body.components) || body.components.length < 1 || body.components.length > 20) throw new ValidationError('Choose between 1 and 20 components.');
      const components: BundleComponent[] = [];
      for (const item of body.components) {
        if (!item || typeof item !== 'object') throw new ValidationError('Invalid component.');
        const id = requireId(item,'product_id');
        if (components.some(c=>c.product_id===id)) throw new ValidationError('Choose a different product for each slot.');
        const qty = requireNumber(item,'quantity',{integer:true,min:1,max:1000});
        if (bundle.quantity_mode === 'bags' && qty !== 1) throw new ValidationError('Bag-count subscriptions use one bag per slot.');
        const products = await client.query(`SELECT p.*, g.type AS group_type FROM products p JOIN roast_groups g ON g.id=p.group_id AND g.tenant_id=p.tenant_id
          WHERE p.id=$1 AND p.tenant_id=$2 AND p.active AND g.active FOR SHARE OF p,g`, [id,tenantId]);
        const p = products.rows[0];
        if (!p) throw new ValidationError('Each component must be one of your active products in an active roast group.');
        if (bundle.contents_mode === 'rotating' && (p.group_type !== 'single_origin' || components.some(c=>c.group_id===p.group_id))) throw new ValidationError('Rotating lineups need a different single-origin roast group in each slot.');
        components.push({product_id:p.id,quantity:qty,name:p.name,lbs:p.lbs,group_id:p.group_id});
      }
      const id = newId('brev');
      await client.query('INSERT INTO bundle_revisions (id,tenant_id,bundle_id,cycle_start,components) VALUES ($1,$2,$3,$4,$5)',
        [id,tenantId,bundle.id,cycle,JSON.stringify(components)]);
      return json({id});
    });
  });
};
