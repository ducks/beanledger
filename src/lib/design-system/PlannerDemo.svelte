<script lang="ts">
  import { calcGroup, formatWeight } from '$lib/calc';
  import type { Product, RoastGroup } from '$lib/types';
  let { concept }: { concept: string } = $props();
  let stage = $state(0);
  let date = $state('2026-10-20');
  let imported = $state(false);
  let completed = $state(false);
  let quantities = $state([24, 12, 8]);
  let batchSize = $state<number | undefined>(20);
  let carry = $state<number | undefined>(2);
  let stock = $state(20);
  let productColumn = $state('');
  let qtyColumn = $state('');
  let mapping = $state(false);
  let note = $state('');
  const stages = ['Choose day', 'Review orders', 'Plan batches', 'Pack & complete'];
  const products: Product[] = [
    { id:'house',name:'House blend · 12 oz',lbs:.75,group_id:'house',active:true,created_at:'2026-10-20' },
    { id:'seasonal',name:'Seasonal single origin · 1 lb',lbs:1,group_id:'seasonal',active:true,created_at:'2026-10-20' },
    { id:'decaf',name:'Evening decaf · 12 oz',lbs:.75,group_id:'decaf',active:true,created_at:'2026-10-20' }
  ];
  const groups: RoastGroup[] = products.map(p=>({id:p.group_id,label:p.name.split(' · ')[0],batch_type:'standard',roast_loss_pct:15,type:'single_origin',components:[],active:true,created_at:'2026-10-20'}));
  const valid = $derived(quantities.every(q=>Number.isInteger(q)&&q>=0&&q<=10000)&&typeof batchSize==='number'&&batchSize>0&&typeof carry==='number'&&carry>=0);
  const orders = $derived(products.map((p,i)=>({id:p.id,product_id:p.id,qty:quantities[i]||0,production_date:date})));
  const plan = $derived(groups.map((g,i)=>calcGroup(g,orders,products,i===0 ? carry||0 : 0,{standard:batchSize||20})));
  const bags12 = $derived((quantities[0]||0)+(quantities[2]||0));
  const shortage = $derived(Math.max(0,bags12-stock));
  function reset() { stage=0; imported=false; completed=false; quantities=[24,12,8]; batchSize=20; carry=2; stock=20; note=''; mapping=false; productColumn=''; qtyColumn=''; }
</script>
<div class="planner-demo {concept}">
  <header><div><p class="eyebrow">Interactive sample workflow</p><h1>{completed ? 'Ready for the next roast.' : 'Tuesday’s roast'}</h1><p>Sample data only · changes stay in this page and reset on reload.</p></div><button onclick={reset}>Reset demo</button></header>
  <div class="flow-layout">
    <nav aria-label="Planner workflow">{#each stages as label,i}<button aria-current={stage===i?'step':undefined} disabled={i>0&&!imported&&stage===0 || i>1&&!imported} onclick={()=>stage=i}><span>0{i+1}</span>{label}</button>{/each}</nav>
    <div class="flow-content">
    {#if completed}
      <section class="complete"><p class="eyebrow">Demo roast completed</p><h2>{date}</h2><p>{quantities.reduce((a,b)=>a+b,0)} bags prepared across three coffees.</p><p>{formatWeight(plan.reduce((a,p)=>a+p.batchesUp*p.batchWeight,0),'lbs')} green coffee planned across {plan.reduce((a,p)=>a+p.batchesUp,0)} batches.</p><h3>Expected roasted carryover</h3>{#each plan as row,i}<p>{groups[i].label}: {formatWeight(row.predictedLeftover,'lbs')}</p>{/each}<p>This preview shows a completion summary. It does not write a snapshot or deduct real inventory.</p><button onclick={reset}>Plan another sample day</button></section>
    {:else if stage===0}
      <section><p class="eyebrow">01 / A date and a starting point</p><h2>What are we roasting?</h2><label for="demo-date">Roast date</label><input id="demo-date" type="date" bind:value={date}/><div class="source"><h3>Wholesale orders</h3><p>3 products · 44 bags · sample CSV export</p><p class="muted">Start with a prepared import or explore mapping a custom format.</p><button class="primary" disabled={!date} onclick={()=>{imported=true;stage=1;}}>Load sample orders →</button><button onclick={()=>mapping=!mapping}>Try custom CSV mapping</button></div>
      {#if mapping}<div class="mapping"><h3>Match your columns</h3><p>This synthetic file uses “Item” for the product and “Units” for quantity.</p><pre>Item,Units\nHouse blend · 12 oz,24\nSeasonal single origin · 1 lb,12\nEvening decaf · 12 oz,8</pre><label for="demo-product-col">Product column</label><select id="demo-product-col" bind:value={productColumn}><option value="">Choose a column</option><option>Item</option><option>Units</option></select><label for="demo-qty-col">Quantity column</label><select id="demo-qty-col" bind:value={qtyColumn}><option value="">Choose a column</option><option>Item</option><option>Units</option></select>{#if productColumn&&qtyColumn&&(productColumn!=='Item'||qtyColumn!=='Units')}<p class="error" role="alert">Products should map to Item and quantities to Units for this sample.</p>{/if}<button class="primary" disabled={!date||productColumn!=='Item'||qtyColumn!=='Units'} onclick={()=>{imported=true;stage=1;note='Custom sample format mapped. Review the imported quantities.';}}>Preview mapped orders →</button></div>{/if}</section>
    {:else if stage===1}
      <section><p class="eyebrow">02 / Import review</p><h2>Make the quantities yours.</h2><p>Adjust the sample order quantities. The planner and packaging totals update together.</p><div class="table-wrap"><table><thead><tr><th>Product</th><th>Bags</th><th>Roasted weight</th></tr></thead><tbody>{#each products as p,i}<tr><th scope="row">{p.name}</th><td><input aria-label={`${p.name} quantity`} type="number" min="0" max="10000" step="1" bind:value={quantities[i]}/></td><td>{formatWeight((quantities[i]||0)*p.lbs,'lbs')}</td></tr>{/each}</tbody></table></div>{#if !valid}<p class="error" role="alert">Use whole bag quantities from 0 to 10,000 and valid roasting settings.</p>{/if}<footer><button onclick={()=>stage=0}>Back to import</button><button class="primary" disabled={!valid||quantities.every(q=>q===0)} onclick={()=>stage=2}>Plan these batches →</button></footer></section>
    {:else if stage===2}
      <section><p class="eyebrow">03 / Roast planner</p><h2>From orders to batches.</h2><p>Roasted carryover reduces what you need to make. This plan allows for 15% roast loss and rounds up to full batches.</p><div class="settings"><div><label for="demo-batch">Green batch size (lb)</label><input id="demo-batch" type="number" min=".1" step=".1" bind:value={batchSize}/></div><div><label for="demo-carry">House blend roasted carryover (lb)</label><input id="demo-carry" type="number" min="0" step=".1" bind:value={carry}/></div></div>{#if valid}<div class="batch-list">{#each plan as row,i}<article><div><h3>{groups[i].label}</h3><p>{formatWeight(row.neededRoasted,'lbs')} roasted still needed</p></div><dl><div><dt>Green needed</dt><dd>{formatWeight(row.needed,'lbs')}</dd></div><div><dt>Full batches</dt><dd>{row.batchesUp} × {row.batchWeight} lb</dd></div><div><dt>Expected carryover</dt><dd>{formatWeight(row.predictedLeftover,'lbs')}</dd></div></dl></article>{/each}</div>{:else}<p class="error" role="alert">Batch size must be positive and carryover must be zero or greater.</p>{/if}<footer><button onclick={()=>stage=1}>Back to orders</button><button class="primary" disabled={!valid} onclick={()=>stage=3}>Review packing →</button></footer></section>
    {:else}
      <section><p class="eyebrow">04 / Packing checklist</p><h2>Give every bag a place.</h2><div class="table-wrap"><table><thead><tr><th>Packaging</th><th>Needed</th><th>On hand</th><th>After packing</th></tr></thead><tbody><tr><th>12 oz bags</th><td>{bags12}</td><td>{stock}</td><td>{stock-bags12}</td></tr><tr><th>1 lb bags</th><td>{quantities[1]}</td><td>100</td><td>{100-quantities[1]}</td></tr></tbody></table></div>{#if shortage>0}<div class="warning"><h3>{shortage} more 12 oz bags needed</h3><p>Resolve the shortage before marking this sample day complete.</p><button onclick={()=>stock+=50}>Receive 50 sample bags</button></div>{/if}{#if quantities[1]>100}<p class="error">Not enough 1 lb bags in this sample. Reduce the quantity to 100 or less to continue.</p>{/if}<p class="muted">Completion is simulated. The real application would save the day’s snapshot and commit packaging usage.</p><footer><button onclick={()=>stage=2}>Back to batches</button><button class="primary" disabled={!valid||shortage>0||quantities[1]>100} onclick={()=>{completed=true;note='Sample day completed. No real data changed.';}}>Complete sample roast</button></footer></section>
    {/if}
    {#if note}<p class="notice" role="status">{note}</p>{/if}
    </div>
  </div>
</div>
<style>
  header { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; margin:2rem 0; }
  h1 { font-size:clamp(2rem,4vw,3rem); line-height:1.15; letter-spacing:-.03em; margin:.5rem 0; } h2 { font-size:1.75rem; margin:.5rem 0 1rem; } h3 { margin:.5rem 0; } p { max-width:70ch; }
  .eyebrow { text-transform:uppercase; font-size:.75rem; letter-spacing:.08em; color:var(--muted); }
  button,input,select { font:inherit; color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:10px; min-height:44px; padding:.65rem .875rem; }
  button { cursor:pointer; font-weight:600; } button.primary { color:var(--on-accent); background:var(--accent); border-color:var(--accent); } button:disabled { opacity:.5; cursor:not-allowed; }
  :focus-visible { outline:3px solid var(--accent); outline-offset:3px; }
  label { display:block; font-weight:600; margin:.75rem 0 .25rem; } input,select { max-width:100%; } .source,.mapping,.warning { border:1px solid var(--line); padding:1.25rem; margin-top:1.5rem; border-radius:12px; } .source button { margin:.5rem .5rem 0 0; } pre { overflow:auto; font-size:.85rem; }
  .flow-layout { display:grid; grid-template-columns:190px minmax(0,1fr); gap:2rem; } nav { display:flex; flex-direction:column; gap:.5rem; } nav button { text-align:left; } nav span { margin-right:.65rem; font-variant-numeric:tabular-nums; } nav button[aria-current='step'] { background:var(--accent); color:var(--on-accent); }
  section { background:var(--surface); padding:1.75rem; border:1px solid var(--line); border-radius:14px; } .flow-content { min-width:0; } .settings { display:grid; grid-template-columns:1fr 1fr; gap:1rem; } .settings input { width:100%; } .batch-list article { border-top:1px solid var(--line); padding:1rem 0; margin-top:1rem; } dl { display:flex; flex-wrap:wrap; gap:1.5rem; } dt { font-size:.8rem; color:var(--muted); } dd { margin:.25rem 0; font-weight:600; font-variant-numeric:tabular-nums; }
  table { width:100%; border-collapse:collapse; } th,td { padding:.875rem .5rem; text-align:left; border-bottom:1px solid var(--line); } td { font-variant-numeric:tabular-nums; } td input { width:90px; } .table-wrap { overflow:auto; } footer { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-top:2rem; } .error,.warning { border-left:4px solid var(--accent); padding-left:1rem; } .muted { color:var(--muted); } .notice { border-top:1px solid var(--line); padding:1rem 0; }
  .guided .flow-layout { display:block; } .guided nav { flex-direction:row; flex-wrap:wrap; margin-bottom:1.5rem; } .guided nav button { flex:1; } .studio h1,.studio h2 { font-family:Georgia,serif; font-weight:400; } .studio section { padding:2.5rem; } .ledger section,.ledger button,.ledger input,.ledger select,.ledger .source,.ledger .mapping,.ledger .warning { border-radius:0; } .ledger section { border-width:1px 0 0; background:transparent; padding:1.5rem 0; } .ledger h1,.ledger h2 { font-family:Georgia,serif; font-weight:400; } .workbench section { padding:1.25rem; } .workbench h2 { font-size:1.4rem; }
  @media(max-width:760px) { .flow-layout { grid-template-columns:1fr; gap:1rem; } nav { flex-direction:row; flex-wrap:wrap; } nav button { flex:1 1 40%; } .settings { grid-template-columns:1fr; } section,.studio section { padding:1rem; } }
</style>
