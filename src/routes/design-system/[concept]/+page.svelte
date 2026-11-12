<script lang="ts">
  import PlannerDemo from '$lib/design-system/PlannerDemo.svelte';
  import { workspaceProducts } from '$lib/design-system/packaging-demo';
  let catalog = $state(workspaceProducts());
  let stocks = $state<Record<string,number>>({trade:200,retail:20,pound:100});
  import PackagingDemo from '$lib/design-system/PackagingDemo.svelte';
  let workspace = $state('Overview');
  let packagingTab = $state('Catalog');
  function navigate(section: string) { workspace = section; if (['Catalog', 'Import review', 'Packing preview'].includes(section)) packagingTab = section; }
  const packagingOpen = $derived(['Catalog', 'Import review', 'Packing preview'].includes(workspace));
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let dark = $state(false);
  let step = $state(0);
  let message = $state('');
  const steps = ['Orders', 'Roasting', 'Packing'];
  const titles: Record<string, string> = { studio: 'The roastery journal', workbench: 'The daily workbench', guided: 'One step at a time', ledger: 'The open ledger' };
  const coffees = [{ name: 'House blend', bags: 24, weight: '18 lb' }, { name: 'Seasonal single origin', bags: 12, weight: '12 lb' }, { name: 'Evening decaf', bags: 8, weight: '6 lb' }];
</script>
<svelte:head><title>{titles[data.concept]} · BeanLedger design exploration</title></svelte:head>
<div class="concept {data.concept}" class:dark>
  <div class="review"><a href="/design-system">← All explorations</a><span>Concept · synthetic data · fonts provisional</span><button onclick={() => dark = !dark}>{dark ? 'Light preview' : 'Dark preview'}</button></div>
  <nav class="directions" aria-label="Design explorations"><a href="/design-system/studio" aria-current={data.concept === 'studio' ? 'page' : undefined}>01 Journal</a><a href="/design-system/workbench" aria-current={data.concept === 'workbench' ? 'page' : undefined}>02 Workbench</a><a href="/design-system/guided" aria-current={data.concept === 'guided' ? 'page' : undefined}>03 Guided</a><a href="/design-system/ledger" aria-current={data.concept === 'ledger' ? 'page' : undefined}>04 Open ledger</a></nav>
  <main>
    <nav class="workspace-nav" aria-label="Workspace navigation">{#each ['Overview', 'Roast planner', 'Catalog', 'Import review', 'Packing preview'] as section}<button aria-current={(packagingOpen ? packagingTab : workspace) === section ? 'page' : undefined} onclick={() => navigate(section)}>{section}</button>{/each}</nav>
    <div hidden={workspace !== 'Roast planner'}><PlannerDemo concept={data.concept} bind:catalog bind:stocks/></div>
    <div hidden={!packagingOpen}><PackagingDemo embedded concept={data.concept} bind:tab={packagingTab} bind:products={catalog} bind:stocks/></div>
    {#if workspace === 'Overview'}
    <button class="primary" onclick={() => navigate('Roast planner')}>Try the interactive roast planner →</button>
    {#if data.concept === 'studio'}
      <header><p class="eyebrow">Tuesday, October 20 · Your roastery</p><h1>A good day<br/>starts here.</h1><p class="lede">A little space to plan, roast, and make something worth sharing.</p></header>
      <div class="journal-grid"><section class="feature"><p class="eyebrow">On the roasting schedule</p><h2>Tuesday’s roast</h2><p>Three coffees. 44 bags. One well-planned day.</p><button class="primary" onclick={() => navigate('Roast planner')}>Pick up where you left off →</button><div class="journal-stat"><strong>36 <small>lb</small></strong><span>roasted coffee needed</span></div></section><aside><h2>The week ahead</h2><div class="week"><span>WED</span><div><strong>Wholesale orders</strong><p>Scheduled · 2 customers</p></div></div><div class="week"><span>FRI</span><div><strong>Weekend stock</strong><p>Scheduled · quantities to review</p></div></div><button onclick={() => message = 'The scheduling form would open here.'}>Schedule another day</button></aside></div>
      <section><h2>Keep your roastery in order</h2><div class="resources">{#each ['Your coffees', 'Bags & packaging', 'Roast history'] as item}<button onclick={() => navigate(item === 'Your coffees' ? 'Catalog' : item === 'Bags & packaging' ? 'Packing preview' : 'Roast planner')}>{item} <span>↗</span></button>{/each}</div></section>
    {:else if data.concept === 'workbench'}
      <header class="compact"><div><p class="eyebrow">Roast day / Tue, Oct 20</p><h1>Tuesday’s workspace</h1></div><button class="primary" onclick={() => navigate('Import review')}>Import orders</button></header>
      <div class="metrics"><div><span>Orders</span><strong>18</strong></div><div><span>Required roast</span><strong>36 lb</strong></div><div><span>Bags to pack</span><strong>44</strong></div><div><span>Review needed</span><strong>1 item</strong></div></div>
      <div class="bench-grid"><section class="surface"><div class="section-heading"><h2>Production list</h2><span>3 coffees</span></div><div class="table-wrap"><table><thead><tr><th>Coffee</th><th>Bags</th><th>Roasted weight</th></tr></thead><tbody>{#each coffees as coffee}<tr><th scope="row">{coffee.name}</th><td>{coffee.bags}</td><td>{coffee.weight}</td></tr>{/each}</tbody></table></div><button onclick={() => navigate('Catalog')}>Review products →</button></section><aside class="surface"><p class="eyebrow">Before you roast</p><h2>One thing to check</h2><p>Check your 12 oz bag inventory before finalizing the packing list.</p><button onclick={() => navigate('Packing preview')}>Review packaging</button><hr/><p class="muted">Last import: wholesale-orders.csv</p><button onclick={() => message = 'The import history would open here.'}>View import history</button></aside></div>
    {:else if data.concept === 'ledger'}
      <header class="ledger-heading"><p class="eyebrow">Roastery / Production / 20 October 2026</p><div class="ledger-title"><h1>The day’s work.</h1><span class="ledger-status">● In progress</span></div><p class="lede">A clear plan, from the first batch to the last bag.</p></header>
      <div class="ledger-layout">
        <section class="ledger-main"><div class="ledger-section"><span class="ledger-number">01</span><h2>Today’s roast</h2><button class="primary" onclick={() => navigate('Roast planner')}>Open planner ↗</button></div>
          <div class="ledger-totals"><div><strong>36 <small>lb</small></strong><span>Roasted coffee needed</span></div><div><strong>44</strong><span>Bags to prepare</span></div><div><strong>3</strong><span>Coffees on the schedule</span></div></div>
          <div class="table-wrap"><table><caption>Tuesday’s production plan · sample quantities</caption><thead><tr><th scope="col">Coffee</th><th scope="col">Bags</th><th scope="col">Roasted weight</th></tr></thead><tbody>{#each coffees as coffee}<tr><th scope="row">{coffee.name}</th><td>{coffee.bags}</td><td>{coffee.weight}</td></tr>{/each}</tbody></table></div>
          <div class="ledger-actions"><button onclick={() => navigate('Import review')}>Import orders</button><button onclick={() => navigate('Catalog')}>Review products →</button></div>
          <div class="ledger-section upcoming"><span class="ledger-number">02</span><h2>Coming up</h2></div>
          <div class="ledger-next"><span>WED / 21</span><strong>Wholesale orders</strong><span class="muted">Scheduled</span></div><div class="ledger-next"><span>FRI / 23</span><strong>Weekend stock</strong><span class="muted">Needs quantities</span></div>
        </section>
        <aside class="ledger-aside"><p class="eyebrow">Before you begin</p><h2>One thing to check.</h2><p>Confirm your 12 oz bag inventory before finalizing the packing list.</p><button onclick={() => navigate('Packing preview')}>Check packaging ↗</button><hr/><p class="eyebrow">Roastery tools</p>{#each ['Coffee catalog', 'Import history', 'Roast reports'] as tool}<button class="ledger-tool" onclick={() => navigate(tool === 'Coffee catalog' ? 'Catalog' : tool === 'Import history' ? 'Import review' : 'Roast planner')}>{tool}<span>↗</span></button>{/each}<p class="ledger-note">Good records make room for good coffee.</p></aside>
      </div>
    {:else}
      <header class="guided-heading"><p class="eyebrow">Tuesday’s roast · guided workspace</p><h1>Let’s get this roast ready.</h1><p class="lede">Three steps, with your next action always in view.</p></header>
      <nav class="steps" aria-label="Roast preparation steps">{#each steps as label, i}<button class:selected={step === i} aria-current={step === i ? 'step' : undefined} onclick={() => step = i}><span>{i + 1}</span>{label}</button>{/each}</nav>
      <section class="step-panel surface"><p class="eyebrow">Step {step + 1} of 3</p><h2>{['Review your orders', 'Plan your batches', 'Prepare your packing list'][step]}</h2><p class="lede">{['Your imported orders are grouped by coffee. Check the quantities before planning your roast.', 'Use your batch sizes and expected roast loss to prepare the work.', 'Review bags and labels before completing the day.'][step]}</p>
        {#if step === 0}{#each coffees as coffee}<div class="order-row"><strong>{coffee.name}</strong><span>{coffee.bags} bags</span></div>{/each}<button onclick={() => navigate('Roast planner')}>Import a different CSV format</button>{:else if step === 1}<div class="summary"><strong>36 lb</strong><span>Total roasted coffee needed</span></div><p>Batch details would be calculated from your saved roasting settings.</p>{:else}<div class="summary"><strong>44 bags</strong><span>Across three coffees</span></div><p>Packaging checks and the printable pick list would appear here.</p>{/if}
        <footer><button disabled={step === 0} onclick={() => step--}>Back</button><button class="primary" onclick={() => { if (step < 2) step++; else message = 'A completion review would appear here. No data has changed.'; }}>{step === 2 ? 'Review completion' : `Continue to ${steps[step + 1].toLowerCase()} →`}</button></footer>
      </section>
    {/if}
    {#if message}<div class="feedback" role="status">{message} <button onclick={() => message = ''}>Dismiss</button></div>{/if}
    {/if}
    <p class="prototype-note">Layout exploration only. Actions do not modify data.</p>
  </main>
</div>
<style>
  [hidden] { display:none !important; }
  .workspace-nav { display:flex; gap:.5rem; flex-wrap:wrap; padding-bottom:1.5rem; margin-bottom:1rem; border-bottom:1px solid var(--line); }
  .workspace-nav button[aria-current='page'] { background:var(--accent); color:var(--on-accent); }
  .ledger .workspace-nav button { border-radius:0; }
  .concept { --canvas:#f7f4ed; --surface:#fffdf8; --ink:#302e27; --muted:#65645a; --line:#d8d5c9; --accent:#425b44; --on-accent:#fff; background:var(--canvas); color:var(--ink); min-height:100vh; font-family:system-ui,sans-serif; line-height:1.5; }
  .concept.dark { --canvas:#20231f; --surface:#2b3029; --ink:#f2efe5; --muted:#b9c1b3; --line:#535c4d; --accent:#bed3ad; --on-accent:#202a1c; color-scheme:dark; }
  .review,.directions { display:flex; align-items:center; gap:1.5rem; padding:1rem 2rem; flex-wrap:wrap; border-bottom:1px solid var(--line); } .review { justify-content:space-between; font-size:.85rem; } a { color:inherit; text-underline-offset:5px; } .directions a[aria-current='page'] { font-weight:750; }
  main { max-width:1200px; margin:auto; padding:3rem 2rem; } header { margin-bottom:2.5rem; } h1 { font-size:clamp(2rem,5vw,3.5rem); line-height:1.1; letter-spacing:-.035em; margin:.75rem 0; } h2 { font-size:1.4rem; margin:.5rem 0 1rem; } p { margin:.5rem 0 1.25rem; } .eyebrow { text-transform:uppercase; letter-spacing:.1em; font-size:.75rem; color:var(--muted); } .lede { color:var(--muted); max-width:52ch; font-size:1.1rem; }
  button { background:var(--surface); color:var(--ink); border:1px solid var(--line); border-radius:10px; min-height:44px; padding:.65rem 1rem; font:inherit; font-weight:600; cursor:pointer; } button.primary { background:var(--accent); color:var(--on-accent); border-color:var(--accent); } button:disabled { opacity:.45; cursor:not-allowed; } button:hover:not(:disabled) { text-decoration:underline; text-underline-offset:4px; } :focus-visible { outline:3px solid var(--accent); outline-offset:3px; }
  .studio h1,.studio h2 { font-family:Georgia,serif; font-weight:400; } .studio h1 { font-size:clamp(3rem,7vw,5rem); } .journal-grid { display:grid; grid-template-columns:1.4fr 1fr; gap:3rem; margin:3rem 0; } .feature { background:var(--surface); padding:2.5rem; border-radius:4px 40px 4px 4px; border:1px solid var(--line); } .journal-stat { display:flex; gap:1.5rem; align-items:center; margin-top:2rem; border-top:1px solid var(--line); padding-top:1.5rem; } .journal-stat strong { font-size:3rem; font-family:Georgia,serif; font-weight:400; } small { font-size:1rem; } .week { display:flex; gap:1.5rem; border-top:1px solid var(--line); padding:1rem 0; } .week > span { color:var(--muted); font-size:.8rem; } .week p { color:var(--muted); margin:.25rem 0; } .resources { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; } .resources button { display:flex; justify-content:space-between; padding:1.5rem; }
  .compact { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; } .workbench h1 { font-size:2rem; } .metrics { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--line); border-radius:12px; margin-bottom:1.5rem; } .metrics div { padding:1.25rem; } .metrics strong,.metrics span { display:block; } .metrics span { color:var(--muted); font-size:.85rem; } .metrics strong { font-size:1.75rem; font-variant-numeric:tabular-nums; } .bench-grid { display:grid; grid-template-columns:2fr 1fr; gap:1.5rem; } .surface { padding:1.5rem; background:var(--surface); border:1px solid var(--line); border-radius:12px; } .section-heading { display:flex; justify-content:space-between; gap:1rem; align-items:baseline; } .table-wrap { overflow-x:auto; margin-bottom:1rem; } table { width:100%; border-collapse:collapse; } th,td { text-align:left; padding:1rem .5rem; border-bottom:1px solid var(--line); } td { font-variant-numeric:tabular-nums; } hr { border:0; border-top:1px solid var(--line); margin:1.5rem 0; } .muted { color:var(--muted); }
  .guided main { max-width:900px; } .steps { display:flex; gap:1rem; margin:2rem 0; } .steps button { flex:1; } .steps span { margin-right:.5rem; } .steps .selected { background:var(--accent); color:var(--on-accent); } .step-panel { padding:2.5rem; } .order-row { display:flex; justify-content:space-between; gap:1rem; border-top:1px solid var(--line); padding:1rem 0; } footer { display:flex; justify-content:space-between; gap:1rem; margin-top:2rem; } .summary { display:flex; flex-direction:column; margin:2rem 0; } .summary strong { font-size:2.5rem; } .prototype-note { color:var(--muted); font-size:.85rem; margin-top:3rem; } .feedback { border:1px solid var(--accent); padding:1rem; margin-top:2rem; border-radius:10px; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
  .ledger { --canvas:#f5f2e9; --surface:#fffdf7; --accent:#744b31; --line:#c9c5b8; }
  .ledger.dark { --canvas:#24231f; --surface:#2e2d27; --accent:#e0b78d; --line:#625e50; }
  .ledger button,.ledger .feedback { border-radius:0; }
  .ledger main { max-width:1280px; }
  .ledger-heading { border-bottom:2px solid var(--ink); padding-bottom:1.5rem; }
  .ledger-title { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .ledger h1 { font-family:Georgia,serif; font-weight:400; font-size:clamp(3rem,6vw,5rem); }
  .ledger-status { font-size:.8rem; color:var(--accent); }
  .ledger-layout { display:grid; grid-template-columns:minmax(0, 1fr) 260px; gap:3rem; }
  .ledger-section { display:flex; align-items:center; gap:1rem; border-bottom:1px solid var(--line); padding-bottom:1rem; }
  .ledger-section h2 { margin:0; flex:1; font-weight:500; }
  .ledger-number { color:var(--muted); font-family:monospace; }
  .ledger-totals { display:grid; grid-template-columns:repeat(3,1fr); padding:1.5rem 0; gap:1rem; }
  .ledger-totals strong,.ledger-totals span { display:block; }
  .ledger-totals strong { font-size:2.5rem; font-weight:450; font-variant-numeric:tabular-nums; }
  .ledger-totals span { font-size:.8rem; color:var(--muted); }
  .ledger caption { text-align:left; color:var(--muted); font-size:.8rem; padding:.75rem .5rem; }
  .ledger th { font-weight:500; }
  .ledger td { text-align:right; }
  .ledger thead th:not(:first-child) { text-align:right; }
  .ledger-actions { display:flex; flex-wrap:wrap; gap:1rem; margin:1.5rem 0 2.5rem; }
  .ledger-next { display:grid; grid-template-columns:90px 1fr auto; gap:1rem; border-bottom:1px solid var(--line); padding:1rem 0; font-size:.875rem; }
  .ledger-aside { border-left:1px solid var(--line); padding-left:2rem; }
  .ledger-aside h2 { font-family:Georgia,serif; font-weight:400; font-size:1.75rem; }
  .ledger-tool { display:flex; justify-content:space-between; width:100%; background:transparent; border:0; border-bottom:1px solid var(--line); padding:.875rem 0; text-align:left; }
  .ledger-note { color:var(--muted); font-family:Georgia,serif; font-style:italic; margin-top:2rem; }
  @media(max-width:760px) { .ledger-layout { grid-template-columns:1fr; gap:2rem; } .ledger-aside { border-left:0; border-top:1px solid var(--line); padding:1.5rem 0 0; } .ledger-totals strong { font-size:1.75rem; } .ledger-next { grid-template-columns:70px 1fr; } .ledger-next > :last-child { grid-column:2; } .ledger-section { flex-wrap:wrap; } }
  @media(max-width:760px) { main { padding:2rem 1rem; } .journal-grid,.bench-grid,.resources { grid-template-columns:1fr; gap:1rem; } .metrics { grid-template-columns:repeat(2,1fr); } .steps { gap:.25rem; } .steps button { padding:.5rem; font-size:.85rem; } .feature,.step-panel { padding:1.25rem; } .review,.directions { padding:1rem; gap:1rem; } }
</style>
