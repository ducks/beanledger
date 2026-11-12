<script lang="ts">
  import '$lib/design-system/tokens.css';
  import { workspaceProducts, demoBags as bags, type DemoProduct as Item } from './packaging-demo';
  const initial = (): Item[] => [
    { id: 1, name: 'House blend', grams: 308, qty: 24, packaging: '' },
    { id: 2, name: 'Seasonal espresso', grams: 309, qty: 12, packaging: 'trade' },
    { id: 3, name: 'Single origin', grams: 310, qty: 18, packaging: '' }
  ];
  let dark = $state(false);
  let { tab = $bindable('Catalog'), embedded = false, concept = 'workbench', products = $bindable(initial()), stocks = $bindable<Record<string, number>>({trade:200,retail:100,pound:100}) }: { tab?: string; embedded?: boolean; concept?: string; products?: Item[]; stocks?: Record<string,number> } = $props();
  let editing = $state<number | null>(null);
  let form = $state(false);
  let importing = $state(false);
  let name = $state('');
  let weight = $state<number | undefined>(310);
  let unit = $state('g');
  let packaging = $state('');
  let notice = $state('');
  const grams = $derived((weight ?? 0) * (unit === 'oz' ? 28.349523125 : 1));
  const unresolved = $derived(products.filter(p => !p.packaging));
  const totals = $derived(bags.map(b => ({ ...b, stock: stocks[b.id], used: products.filter(p => p.packaging === b.id).reduce((sum, p) => sum + p.qty, 0) })));
  function label(id: string) { return id === 'bulk' ? 'Untracked / bulk' : bags.find(b => b.id === id)?.label ?? 'Needs assignment'; }
  function open(product?: Item, csv = false) {
    editing = product?.id ?? null;
    importing = csv;
    name = product?.name ?? (csv ? 'Imported coffee — 10.9oz' : '');
    weight = product?.grams ?? (csv ? 10.9 : 310);
    unit = csv ? 'oz' : 'g';
    packaging = product?.packaging ?? '';
    form = true;
  }
  function save() {
    if (!name.trim() || !Number.isFinite(grams) || grams <= 0 || !packaging) return;
    if (editing !== null) {
      products = products.map(p => p.id === editing ? { ...p, name: name.trim(), grams, packaging } : p);
    } else {
      products = [...products, { id: Math.max(...products.map(p => p.id)) + 1, name: name.trim(), grams, qty: importing ? 8 : 0, packaging }];
    }
    if (importing) tab = 'Packing preview';
    notice = importing ? 'Imported 8 bags with the confirmed packaging assignment.' : 'Product saved in this preview. Historical inventory is unchanged.';
    form = false;
  }
</script>


<div class="preview {concept}" class:embedded class:design-system={!embedded} data-preview-theme={embedded ? undefined : dark ? 'dark' : 'light'}>
  {#if !embedded}<div class="preview-bar"><span>Interactive spike · synthetic data · resets on reload</span><button onclick={() => dark = !dark}>{dark ? 'Light mode' : 'Dark mode'}</button></div>{/if}
  <main>
    {#if !embedded}<a href="/design-system">← Design workshop</a>{/if}
    <header><div><p class="eyebrow">BeanLedger / Catalog & packaging</p><h1>Coffee weight. Bag choice.</h1><p>Choose the coffee quantity and the physical packaging separately.</p></div><button onclick={() => { products = embedded ? workspaceProducts() : initial(); stocks = {trade:200,retail:embedded ? 20 : 100,pound:100}; notice = ''; form = false; }}>Reset preview</button></header>
    {#if !embedded}<nav aria-label="Packaging prototype">{#each ['Catalog', 'Import review', 'Packing preview'] as section}<button class:selected={tab === section} onclick={() => tab = section}>{section}</button>{/each}</nav>{/if}
    {#if notice}<p role="status" class="notice">{notice}</p>{/if}
    {#if tab === 'Catalog'}
      <div class="heading"><h2>Products</h2><button class="primary" onclick={() => open()}>Add Product</button></div>
      <p>Existing products keep their coffee weights. Review their packaging before switching inventory tracking to explicit assignments.</p>
      <div class="table-scroll"><table><thead><tr><th>Product</th><th>Coffee per bag</th><th>Packaging</th><th></th></tr></thead><tbody>
        {#each products as product}<tr><th>{product.name}</th><td>{product.grams.toFixed(1).replace(/\.0$/, '')} g <span class="muted">({(product.grams / 28.349523125).toFixed(1)} oz)</span></td><td><span class:pending={!product.packaging}>{label(product.packaging)}</span></td><td><button aria-label={`Edit ${product.name}`} onclick={() => open(product)}>Edit</button></td></tr>{/each}
      </tbody></table></div>
      <button class="primary" onclick={() => { tab = 'Packing preview'; form = false; }}>Review packing →</button>
      <p class="muted">A packaging name is a stock label, not a measurement of coffee. Different coffee weights can use the same bag.</p>
    {:else if tab === 'Import review'}
      <h2>Review an unmatched CSV product</h2><p>Confirm packaging when creating a product from an import. A size in its name is only a weight suggestion.</p>
      <section><h3>Imported coffee — 10.9oz</h3><p>8 bags · no matching product</p><button class="primary" onclick={() => open(undefined, true)}>Create product & review packaging</button></section>
      <p class="muted">This sample demonstrates product creation from an unmatched row. It does not upload a CSV or write an import.</p>
    {:else}
      <div class="heading"><h2>Packing preview</h2><button onclick={() => tab = 'Catalog'}>Review product assignments</button></div><p>Quantities are shared with the roast planner. New catalog products have no orders; the sample import adds 8 bags.</p>
      {#if unresolved.some(p => p.qty > 0)}<p class="pending" role="status">Incomplete: {unresolved.filter(p => p.qty > 0).length} ordered product(s) need a packaging assignment. These quantities are not included below.</p>{/if}
      <div class="table-scroll"><table><thead><tr><th>Packaging inventory</th><th>On hand</th><th>Bags required</th><th>Projected remaining</th></tr></thead><tbody>{#each totals as bag}<tr><th>{bag.label}</th><td>{bag.stock}</td><td>{bag.used}</td><td>{bag.stock - bag.used}</td></tr>{/each}</tbody></table></div>
      <p>Untracked / bulk: {products.filter(p => p.packaging === 'bulk').reduce((n, p) => n + p.qty, 0)} units. No bag stock deducted.</p>
      <p class="muted">Preview only. Saving an assignment changes this open-order projection, not completed-day consumption or existing stock.</p>
    {/if}
    {#if form}
      <section class="editor" aria-label="Product editor">
        <div class="heading"><h2>{importing ? 'Create imported product' : editing !== null ? 'Edit product' : 'Create product'}</h2><button onclick={() => form = false}>Cancel</button></div>
        <form onsubmit={(e) => { e.preventDefault(); save(); }}>
          <label>Product name<input bind:value={name} required /></label>
          <div class="weight-row"><label>Coffee weight<input type="number" min="0.001" step="any" bind:value={weight} required /></label><label>Unit<select aria-label="Unit" value={unit} onchange={(e) => { const currentGrams = grams; unit = e.currentTarget.value; weight = unit === 'oz' ? currentGrams / 28.349523125 : currentGrams; }}><option value="g">Grams (g)</option><option value="oz">Ounces (oz)</option></select></label></div>
          <p class="muted">Used for roast calculations. {grams > 0 ? `${grams.toFixed(2)} g ≈ ${(grams / 28.349523125).toFixed(2)} oz.` : ''}</p>
          <label>Packaging<select aria-label="Packaging" bind:value={packaging} required><option value="" disabled>Choose packaging…</option>{#each bags as bag}<option value={bag.id}>{bag.label}</option>{/each}<option value="bulk">Untracked / bulk — do not deduct bags</option></select></label>
          <p>One unit of this product uses one bag from the selected inventory. Coffee weight does not choose the bag automatically.</p>
          {#if !packaging}<p class="pending">Confirm a packaging choice, even when the product name contains a bag size.</p>{/if}
          <button class="primary" type="submit" disabled={!name.trim() || !weight || weight <= 0 || !packaging}>{importing ? 'Create product & import 8 bags' : 'Save product'}</button>
        </form>
      </section>
    {/if}
  </main>
</div>
<style>
  .embedded { --ds-canvas:var(--canvas); --ds-surface:var(--surface); --ds-ink:var(--ink); --ds-muted:var(--muted); --ds-line:var(--line); --ds-brand:var(--accent); --ds-on-brand:var(--on-accent); }
  .preview.embedded { min-height:0; } .embedded main { padding:0; max-width:none; }
  .studio h1,.studio h2,.ledger h1,.ledger h2 { font-family:Georgia,serif; font-weight:400; }
  .studio section { padding:32px; } .studio td,.studio th { padding:24px 12px; }
  .workbench td,.workbench th { padding:12px; } .workbench h1 { font-size:28px; }
  .ledger button,.ledger input,.ledger select,.ledger section { border-radius:0; } .ledger section { border-width:1px 0; background:transparent; }
  .guided .editor { margin-inline:auto; } .guided header { max-width:720px; }
  .preview { min-height: 100vh; background: var(--ds-canvas); color: var(--ds-ink); }
  main { max-width: 1100px; margin: auto; padding: 32px 24px 80px; }
  .preview-bar, header, .heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .preview-bar { padding: 12px 24px; border-bottom: 1px solid var(--ds-line); }
  header { margin: 32px 0; } h1 { font-size: clamp(28px, 4vw, 42px); margin: 8px 0; } h2 { font-size: 24px; } p { line-height: 1.6; }
  .eyebrow, .muted { color: var(--ds-muted); } a { color: var(--ds-brand); }
  button, input, select { font: inherit; border: 1px solid var(--ds-line); border-radius: 4px; padding: 10px 14px; background: var(--ds-surface); color: var(--ds-ink); }
  button { cursor: pointer; } button:disabled { opacity: .5; cursor: not-allowed; }
  button.primary, nav .selected { background: var(--ds-brand); color: var(--ds-on-brand, white); }
  nav { display: flex; gap: 8px; border-bottom: 1px solid var(--ds-line); padding-bottom: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .table-scroll { overflow-x: auto; } table { border-collapse: collapse; width: 100%; text-align: left; } td, th { padding: 18px 12px; border-bottom: 1px solid var(--ds-line); } th { font-weight: 600; }
  section { border: 1px solid var(--ds-line); padding: 24px; margin-top: 24px; background: var(--ds-surface); }
  .editor { max-width: 650px; } label { display: flex; flex-direction: column; gap: 8px; font-weight: 600; margin: 16px 0; } .weight-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
  .pending { color: var(--ds-ink); border-left: 3px solid #b58434; padding-left: 10px; } .notice { border-left: 3px solid var(--ds-brand); padding: 12px; }
  @media(max-width: 600px) { header { align-items: start; flex-direction: column; } .preview-bar { flex-wrap: wrap; } main { padding: 20px 12px; } }
</style>
