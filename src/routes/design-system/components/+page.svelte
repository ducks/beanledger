<script lang="ts">
  import '$lib/design-system/tokens.css';
  import Button from '$lib/design-system/Button.svelte';
  let dark = $state(false);
  let quantity = $state<number | undefined>(12);
  let notice = $state('');
</script>
<svelte:head><title>BeanLedger · Component playground</title></svelte:head>
<div class="design-system" data-preview-theme={dark ? 'dark' : 'light'}>
  <main>
    <header><a href="/design-system">← Design gallery</a><Button onclick={() => dark = !dark}>{dark ? 'Light mode' : 'Dark mode'}</Button></header>
    <h1>Component playground</h1>
    <p class="muted">Isolated examples of buttons, forms, tables, and feedback states. For connected workflows, choose a concept in the design gallery.</p>
    {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      <section aria-labelledby="patterns"><p class="label">Component language</p><h2 id="patterns">Clear choices, visible feedback</h2><div class="grid"><div class="panel"><h3>Actions</h3><p class="muted">One primary action per task. Destructive actions stay separate.</p><div class="buttons"><Button variant="primary" onclick={() => notice = 'Preview saved.'}>Save changes</Button><Button onclick={() => notice = 'Preview cancelled.'}>Cancel</Button><Button disabled>Saving…</Button></div><hr/><Button variant="danger" onclick={() => notice = 'A confirmation would explain what is deleted before proceeding.'}>Delete roast day</Button></div><div class="panel"><h3>Forms</h3><label for="quantity">Bag quantity</label><p class="muted" id="quantity-help">Whole bags, at least one. Units stay beside the value.</p><input id="quantity" type="number" min="1" step="1" bind:value={quantity} aria-describedby="quantity-help quantity-error" aria-invalid={quantity === undefined || quantity < 1 || !Number.isInteger(quantity)}/><p id="quantity-error" class="error">{quantity === undefined || quantity < 1 || !Number.isInteger(quantity) ? 'Enter a whole number of bags, at least 1.' : ''}</p></div></div></section>
      <section aria-labelledby="data"><h2 id="data">Readable operational data</h2><div class="panel table-wrap"><table><caption>Synthetic packing list</caption><thead><tr><th scope="col">Product</th><th scope="col">Bag size</th><th scope="col" class="number">Quantity</th><th scope="col">Status</th></tr></thead><tbody><tr><th scope="row">House blend</th><td>12 oz</td><td class="number">24</td><td><span class="badge">Ready</span></td></tr><tr><th scope="row">Seasonal single origin</th><td>1 lb</td><td class="number">12</td><td>Needs review</td></tr></tbody></table></div></section>
      <section><h2>States are part of the design</h2><div class="grid"><div class="panel"><h3>No scheduled days yet</h3><p class="muted">Your next roast starts with a date. Add orders when you’re ready.</p><Button onclick={() => notice = 'The scheduling form would open here.'}>Schedule a day</Button></div><div class="panel error-panel"><h3>Couldn’t load roast days</h3><p>Your data hasn’t been replaced with an empty list.</p><Button onclick={() => notice = 'Retry requested in the prototype.'}>Try again</Button></div></div></section>
  </main>
</div>
<style>
  .design-system { min-height:100vh; } main { max-width:1000px; margin:auto; padding:32px 24px; }
  header,.buttons { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; }
  a { color:var(--ds-brand); } h1 { font-size:clamp(28px,5vw,40px); } h2 { font-size:24px; } h3 { margin-top:0; }
  .muted,caption,.label { color:var(--ds-muted); } section { margin:40px 0; }
  .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .panel { padding:24px; background:var(--ds-surface); border:1px solid var(--ds-line); border-radius:12px; }
  .buttons { justify-content:flex-start; } hr { border:0; border-top:1px solid var(--ds-line); margin:24px 0; }
  .notice,.badge { background:var(--ds-positive); color:var(--ds-positive-ink); padding:8px; }
  .error { color:var(--ds-error); min-height:1.5em; } .error-panel { background:var(--ds-error-surface); }
  .table-wrap { overflow:auto; } table { width:100%; border-collapse:collapse; } th,td { text-align:left; padding:12px; border-bottom:1px solid var(--ds-line); } caption { text-align:left; } .number { text-align:right; }
  @media(max-width:650px) { .grid { grid-template-columns:1fr; } main { padding:24px 16px; } }
</style>
