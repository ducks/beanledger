<script lang="ts">
  import '$lib/design-system/tokens.css';
  import Button from '$lib/design-system/Button.svelte';
  let dark = $state(false);
  let section = $state('Roast days');
  let quantity = $state<number | undefined>(12);
  let notice = $state('');
  const sections = ['Roast days', 'Catalog', 'Packaging', 'Reports', 'Settings'];
</script>
<svelte:head><title>BeanLedger · Design workshop</title></svelte:head>
<div class="design-system" data-preview-theme={dark ? 'dark' : 'light'}>
  <div class="workshop-bar"><span>Design workshop · proposal, synthetic data</span><Button onclick={() => dark = !dark}>{dark ? 'Preview light theme' : 'Preview dark theme'}</Button></div>
  <div class="shell">
    <aside><p class="label">Workspace navigation</p><nav aria-label="Prototype navigation">{#each sections as item}<button class:current={section === item} aria-current={section === item ? 'page' : undefined} onclick={() => section = item}>{item}</button>{/each}</nav><p class="muted">Brand and fonts are still open. This explores structure and interaction.</p></aside>
    <main>
      <section aria-label="Design explorations" class="panel">
        <p class="label">Four directions to compare</p>
        <h2>Explore the whole experience</h2>
        <p><a href="/design-system/studio">01 · Roastery journal</a> — spacious, editorial, and organized around the week.</p>
        <p><a href="/design-system/workbench">02 · Daily workbench</a> — compact operational overview with production data and review tasks together.</p>
        <p><a href="/design-system/guided">03 · Guided workspace</a> — one clear step at a time, from orders to packing.</p>
        <p><a href="/design-system/ledger">04 · Open ledger</a> — square edges, editorial typography, thin rules, and an open layout without cards.</p>
      </section>
      <header><div><p class="label">Roastery workspace</p><h1>{section}</h1><p class="muted">{section === 'Roast days' ? 'Plan the work. Keep the day moving.' : `A dedicated home for ${section.toLowerCase()}, instead of another modal.`}</p></div><Button variant="primary" onclick={() => notice = 'Prototype action selected. No roast day was created.'}>Start a roast day</Button></header>
      {#if notice}<p class="notice" role="status">{notice}</p>{/if}
      <section aria-labelledby="overview"><h2 id="overview">{section === 'Roast days' ? 'Today’s work' : `${section} workspace preview`}</h2><div class="panel"><div class="row"><div><span class="badge">In progress</span><h3>Tuesday’s roast</h3><p class="muted">Orders imported · ready to review</p></div><Button onclick={() => notice = 'The roast workspace would open here. This is a layout preview.'}>Continue planning →</Button></div><dl><div><dt>Orders</dt><dd>18</dd></div><div><dt>Roasted coffee needed</dt><dd>126 <small>lb</small></dd></div><div><dt>Next step</dt><dd class="next">Review batches</dd></div></dl></div></section>
      <section aria-labelledby="patterns"><p class="label">Component language</p><h2 id="patterns">Clear choices, visible feedback</h2><div class="grid"><div class="panel"><h3>Actions</h3><p class="muted">One primary action per task. Destructive actions stay separate.</p><div class="buttons"><Button variant="primary" onclick={() => notice = 'Preview saved.'}>Save changes</Button><Button onclick={() => notice = 'Preview cancelled.'}>Cancel</Button><Button disabled>Saving…</Button></div><hr/><Button variant="danger" onclick={() => notice = 'A confirmation would explain what is deleted before proceeding.'}>Delete roast day</Button></div><div class="panel"><h3>Forms</h3><label for="quantity">Bag quantity</label><p class="muted" id="quantity-help">Whole bags, at least one. Units stay beside the value.</p><input id="quantity" type="number" min="1" step="1" bind:value={quantity} aria-describedby="quantity-help quantity-error" aria-invalid={quantity === undefined || quantity < 1 || !Number.isInteger(quantity)}/><p id="quantity-error" class="error">{quantity === undefined || quantity < 1 || !Number.isInteger(quantity) ? 'Enter a whole number of bags, at least 1.' : ''}</p></div></div></section>
      <section aria-labelledby="data"><h2 id="data">Readable operational data</h2><div class="panel table-wrap"><table><caption>Synthetic packing list</caption><thead><tr><th scope="col">Product</th><th scope="col">Bag size</th><th scope="col" class="number">Quantity</th><th scope="col">Status</th></tr></thead><tbody><tr><th scope="row">House blend</th><td>12 oz</td><td class="number">24</td><td><span class="badge">Ready</span></td></tr><tr><th scope="row">Seasonal single origin</th><td>1 lb</td><td class="number">12</td><td>Needs review</td></tr></tbody></table></div></section>
      <section><h2>States are part of the design</h2><div class="grid"><div class="panel"><h3>No scheduled days yet</h3><p class="muted">Your next roast starts with a date. Add orders when you’re ready.</p><Button onclick={() => notice = 'The scheduling form would open here.'}>Schedule a day</Button></div><div class="panel error-panel"><h3>Couldn’t load roast days</h3><p>Your data hasn’t been replaced with an empty list.</p><Button onclick={() => notice = 'Retry requested in the prototype.'}>Try again</Button></div></div></section>
    </main>
  </div>
</div>
<style>
  .design-system { min-height: 100vh; }
  a { color: var(--ds-brand); text-underline-offset: 4px; }
  .workshop-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 2rem; border-bottom: 1px solid var(--ds-line); }
  .shell { max-width: 1440px; margin: auto; display: grid; grid-template-columns: 220px minmax(0, 1fr); }
  aside { padding: 2rem 1.5rem; border-right: 1px solid var(--ds-line); }
  nav { display: grid; gap: .5rem; margin-bottom: 2rem; }
  nav button { text-align: left; font: inherit; padding: .75rem; background: transparent; color: var(--ds-muted); border: 0; border-radius: .625rem; cursor: pointer; }
  nav button.current { color: var(--ds-positive-ink); background: var(--ds-positive); font-weight: 650; }
  main { padding: 2.5rem; min-width: 0; }
  header, .row { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
  h1 { font-size: clamp(2rem, 4vw, 2.75rem); letter-spacing: -.04em; line-height: 1.15; margin: .5rem 0; font-weight: 650; }
  h2 { font-size: 1.25rem; margin: 0 0 1rem; } h3 { font-size: 1.1rem; margin: .5rem 0; }
  p { margin: .5rem 0 1rem; } .muted, dt, caption { color: var(--ds-muted); }
  .label { font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: var(--ds-muted); }
  section { margin-top: 2.5rem; } .panel { padding: 1.5rem; background: var(--ds-surface); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-panel); }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .badge, .notice { color: var(--ds-positive-ink); background: var(--ds-positive); padding: .25rem .625rem; border-radius: .375rem; font-size: .875rem; }
  .notice { margin-top: 1rem; padding: 1rem; }
  dl { display: flex; flex-wrap: wrap; gap: 2.5rem; border-top: 1px solid var(--ds-line); padding-top: 1rem; margin-bottom: 0; } dd { margin: .25rem 0 0; font-size: 1.75rem; font-variant-numeric: tabular-nums; } dd.next { font-size: 1rem; } small { font-size: .875rem; }
  .buttons { display: flex; flex-wrap: wrap; gap: .5rem; } hr { border: 0; border-top: 1px solid var(--ds-line); margin: 1.5rem 0; }
  label { font-weight: 600; } .error { color: var(--ds-error); min-height: 1.5em; } .error-panel { background: var(--ds-error-surface); }
  .table-wrap { overflow-x: auto; } table { border-collapse: collapse; width: 100%; } caption { text-align: left; margin-bottom: 1rem; } th, td { padding: .875rem .5rem; text-align: left; border-bottom: 1px solid var(--ds-line); } .number { text-align: right; font-variant-numeric: tabular-nums; }
  @media (max-width: 800px) { .shell { grid-template-columns: 1fr; } aside { border-right: 0; padding: 1rem; } aside > p { display: none; } nav { display: flex; flex-wrap: wrap; margin: 0; } main { padding: 1.25rem; } .grid { grid-template-columns: 1fr; } .workshop-bar { padding: 1rem; flex-wrap: wrap; } }
</style>
