<script lang="ts">
  import { onMount } from 'svelte';
  import { cycleLabel, revisionFor, type Bundle, type BundleRevision } from '$lib/bundles';
  import type { Product, RoastGroup } from '$lib/types';
  import { formatPackageSize } from '$lib/calc';
  import { units } from '$lib/stores/units';

  let bundles = $state<Bundle[]>([]);
  let products = $state<Product[]>([]);
  let groups = $state<RoastGroup[]>([]);
  let current = $state('');
  let next = $state('');
  let selected = $state('');
  let window = $state<'current'|'next'>('current');
  let slots = $state<{product_id:string;quantity:number}[]>([]);
  let baseRevision = $state<string|null>(null);
  let name = $state('');
  let contentsMode = $state<'fixed'|'rotating'>('rotating');
  let quantityMode = $state<'bags'|'packs'>('bags');
  let error = $state('');
  let message = $state('');
  let busy = $state(false);
  let ready = $state(false);
  const bundle = $derived(bundles.find(b=>b.id===selected));
  const date = $derived(window==='current' ? current : next);
  const revision = $derived(bundle && date ? revisionFor(bundle,date) : undefined);
  const available = $derived(products.filter(p=>p.active && groups.some(g=>g.id===p.group_id && g.active && (bundle?.contents_mode!=='rotating' || g.type==='single_origin'))));
  const imported = $derived(bundle?.revisions.filter(r=>r.cycle_start===(bundle.contents_mode==='fixed'?null:date)).reduce((n,r)=>n+r.imported_lines,0)??0);

  async function api(url:string, options?:RequestInit) {
    const response = await fetch(url,options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error??'Request failed');
    return data;
  }
  async function load() {
    const [data,p,g] = await Promise.all([api('/api/bundles'),api('/api/products'),api('/api/groups')]);
    bundles=data.bundles; current=data.current; next=data.next; products=p; groups=g;
    if (!selected) selected=bundles[0]?.id??'';
    resetSlots(); ready=true; error='';
  }
  function resetSlots() {
    const chosen=bundles.find(b=>b.id===selected);
    const rev=chosen ? revisionFor(chosen,window==='current'?current:next) : undefined;
    baseRevision=rev?.id??null;
    slots=rev ? rev.components.map(c=>({product_id:c.product_id,quantity:c.quantity})) : Array.from({length:3},()=>({product_id:'',quantity:1}));
    message='';
  }
  async function create() {
    busy=true; error='';
    try {
      const created=await api('/api/bundles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,contents_mode:contentsMode,quantity_mode:quantityMode})});
      selected=created.id; window='current'; name=''; await load();
    } catch(e) { error=e instanceof Error?e.message:'Could not create bundle'; }
    finally {busy=false;}
  }
  async function save() {
    if(!bundle) return;
    busy=true; error='';
    try {
      await api('/api/bundles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:bundle.id,cycle_start:date,base_revision_id:baseRevision,components:slots})});
      await load(); message='Contents saved. Existing imported orders are unchanged.';
    } catch(e) {error=e instanceof Error?e.message:'Could not save contents';}
    finally {busy=false;}
  }
  async function archive() {
    if(!bundle) return;
    busy=true; error='';
    try {await api('/api/bundles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:bundle.id,active:!bundle.active})});await load();}
    catch(e){error=e instanceof Error?e.message:'Could not update bundle';}
    finally{busy=false;}
  }
  function recentUse(id:string) {
    if(!bundle || bundle.contents_mode!=='rotating') return '';
    const group=products.find(p=>p.id===id)?.group_id;
    const past=bundle.revisions.filter(r=>r.cycle_start && r.cycle_start<date);
    const cycles=[...new Set(past.map(r=>r.cycle_start))].sort().reverse().slice(0,2);
    const last=past.filter(r=>cycles.includes(r.cycle_start)).find(r=>r.components.some(c=>c.group_id===group));
    return last ? `Recently selected in ${cycleLabel(last.cycle_start!)}.` : '';
  }
  function historyLabel(r:BundleRevision) {
    return r.cycle_start ? cycleLabel(r.cycle_start) : 'Fixed contents';
  }
  onMount(()=>{load().catch(e=>{error=e.message;});});
</script>

<section aria-label="Bundles" class="bundles">
  <h3>Bundles</h3>
  <p>Split subscription and sampler lines into existing products. Bag-count subscriptions take one bag from each slot in order; pack quantities multiply every component.</p>
  <p>Rotating lineups use the <strong>production date</strong>: 1st–14th and 15th–month-end. Only Current and Next can be edited. Cycle dates use the server’s UTC calendar.</p>
  {#if error}<p role="alert" class="error">{error}</p><button onclick={()=>load().catch(e=>error=e.message)} disabled={busy}>Reload bundles</button>{/if}
  {#if message}<p role="status">{message}</p>{/if}
  {#if !ready && !error}<p>Loading bundles…</p>{/if}
  {#if ready}
    <details class="create" open={bundles.length===0}>
      <summary>Create a bundle</summary>
      <form onsubmit={(e)=>{e.preventDefault();create();}}>
        <label>CSV bundle name<input required maxlength="200" bind:value={name} placeholder="Exact incoming subscription or sampler name" /></label>
        <label>Contents<select bind:value={contentsMode}><option value="rotating">Rotating single origins</option><option value="fixed">Fixed sampler / pack</option></select></label>
        <label>CSV quantity means<select bind:value={quantityMode}><option value="bags">Bags — fill slots in order</option><option value="packs">Packs — multiply all components</option></select></label>
        <button disabled={busy || !name.trim()}>Create bundle</button>
      </form>
    </details>
    {#if bundles.length}
      <label>Bundle<select bind:value={selected} onchange={()=>{window='current';resetSlots();}} disabled={busy}>
        {#each bundles as b}<option value={b.id}>{b.name}{!b.active?' (archived)':''}</option>{/each}
      </select></label>
    {/if}
    {#if bundle}
      <div class="bundle-header"><p>{bundle.contents_mode==='rotating'?'Rotating single origins':'Fixed contents'} · Quantity means {bundle.quantity_mode}</p><button onclick={archive} disabled={busy}>{bundle.active?'Archive bundle':'Restore bundle'}</button></div>
      <p class="hint">CSV names match exactly, ignoring case and outer spaces. Keep this name distinct from product names and import aliases. Bundle type and quantity meaning stay fixed; create a new bundle if those change.</p>
      {#if bundle.contents_mode==='rotating'}
        <div class="cycle-tabs" role="group" aria-label="Lineup cycle">
          <button class:active={window==='current'} aria-pressed={window==='current'} onclick={()=>{window='current';resetSlots();}} disabled={busy}>Current · {cycleLabel(current)}</button>
          <button class:active={window==='next'} aria-pressed={window==='next'} onclick={()=>{window='next';resetSlots();}} disabled={busy}>Next · {cycleLabel(next)}</button>
        </div>
      {/if}
      {#if imported}<p class="notice">{imported} imported bundle line(s) already use contents from this {bundle.contents_mode==='fixed'?'bundle':'cycle'}. Changes apply only to new imports; those orders keep their selected coffees.</p>{/if}
      {#if !revision}<p>No contents saved yet. Imports for this {bundle.contents_mode==='fixed'?'bundle':'cycle'} are blocked until you save a complete lineup.</p>{/if}
      <div class="slots">
        {#each slots as slot,i}
          <div class="slot">
            <label for="bundle-slot-{i}">Slot {i+1}<select id="bundle-slot-{i}" bind:value={slot.product_id} disabled={busy}>
              <option value="">Choose a product and bag size</option>
              {#if slot.product_id && !available.some(p=>p.id===slot.product_id)}<option value={slot.product_id}>Unavailable product — select a replacement</option>{/if}
              {#each available as p}<option value={p.id}>{p.name} · {formatPackageSize(p.lbs,$units)}</option>{/each}
            </select></label>
            {#if bundle.quantity_mode==='packs'}<label>Bags per pack<input type="number" min="1" max="1000" step="1" bind:value={slot.quantity} disabled={busy}/></label>{/if}
            <button onclick={()=>slots=slots.filter((_,index)=>index!==i)} disabled={busy || slots.length===1} aria-label="Remove slot {i+1}">Remove</button>
            {#if slot.product_id && recentUse(slot.product_id)}<p class="notice">{recentUse(slot.product_id)}</p>{/if}
          </div>
        {/each}
      </div>
      <div class="actions"><button onclick={()=>slots=[...slots,{product_id:'',quantity:1}]} disabled={busy || slots.length>=20}>Add slot</button><button onclick={save} disabled={busy || !bundle.active || slots.some(s=>!s.product_id)}>Save contents</button></div>
      <p class="hint">Bag-count CSVs must contain one original line per subscription, not an aggregated total. Quantities above the slot count are flagged; they never wrap around.</p>
      <h4>Imported coffee history</h4>
      {#if bundle.imported_usage?.length}
        <div class="usage-table"><table><thead><tr><th>Coffee / product</th><th>Bags imported</th><th>Last production date</th></tr></thead>
          <tbody>{#each bundle.imported_usage as usage}<tr><td>{usage.name}</td><td>{usage.bag_count}</td><td>{usage.last_production_date}</td></tr>{/each}</tbody>
        </table></div>
      {:else}<p>No bundle bags imported yet.</p>{/if}
      <h4>Lineup history</h4>
      <p>Selections and imported usage, not shipment confirmation. Every save retains the prior revision. Imported counts exclude deleted imports.</p>
      {#if !bundle.revisions.length}<p>No saved lineups yet.</p>{/if}
      {#each bundle.revisions as r}
        <details class="history"><summary>{historyLabel(r)} · {r.imported_lines} imported line(s) · saved {new Date(r.created_at).toLocaleString()}</summary>
          <ol>{#each r.components as c}<li>{c.name} · {formatPackageSize(c.lbs,$units)} × {c.quantity}</li>{/each}</ol>
        </details>
      {/each}
    {/if}
  {/if}
</section>

<style>
  .usage-table {overflow-x:auto;} table {width:100%;border-collapse:collapse;font-size:12px;} th,td {text-align:left;padding:8px;border-bottom:1px solid var(--border);}
  .bundles {color:var(--text);line-height:1.5;} p {font-size:13px;} .hint {color:var(--text-muted);}
  label {display:flex;flex-direction:column;gap:6px;font-size:12px;min-width:0;}
  input,select,button {font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--border);padding:10px;min-height:40px;max-width:100%;border-radius:0;}
  button {cursor:pointer;} button:hover:not(:disabled),button.active {border-color:var(--accent);color:var(--accent);} button:disabled {opacity:.5;cursor:not-allowed;}
  form,.slots {display:grid;gap:12px;margin:16px 0;} form {grid-template-columns:repeat(2,minmax(0,1fr));align-items:end;}
  .slot {display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:end;gap:10px;border-bottom:1px solid var(--border);padding:12px 0;}
  .slot p {grid-column:1/-1;margin:0;} .slot input {width:100px;}
  .cycle-tabs,.actions,.bundle-header {display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:16px 0;} .bundle-header {justify-content:space-between;}
  .notice {border-left:3px solid var(--accent);padding:8px 12px;background:var(--bg-sunken);}
  .error {color:var(--danger);} .history,.create {border:1px solid var(--border);padding:12px;margin:10px 0;} summary {cursor:pointer;}
  @media(max-width:600px) {form,.slot {grid-template-columns:minmax(0,1fr);} button {min-height:44px;}}
</style>
