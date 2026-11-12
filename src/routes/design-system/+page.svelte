<script lang="ts">
  import '$lib/design-system/tokens.css';
  import Button from '$lib/design-system/Button.svelte';
  let dark = $state(false);
</script>
<svelte:head><title>BeanLedger · Design gallery</title></svelte:head>
<div class="design-system" data-preview-theme={dark ? 'dark' : 'light'}>
  <main>
    <header><span>BeanLedger / Design explorations</span><Button onclick={() => dark = !dark}>{dark ? 'Light mode' : 'Dark mode'}</Button></header>
    <h1>Choose a workspace to explore.</h1>
    <p class="intro">Four design directions, each with a connected catalog, order review, roast planner, and packing flow. Choose one to try the experience.</p>
    <p class="muted">Synthetic data only. Changes stay in the preview and reset on reload. Each concept includes light and dark modes.</p>
    <nav class="gallery" aria-label="Interactive design concepts">
      <a class="studio" href="/design-system/studio"><span>01 / Spacious & editorial</span><h2>Roastery journal</h2><p>A quieter workspace with generous spacing, serif headings, and room to plan the day.</p><strong>Explore Journal →</strong></a>
      <a href="/design-system/workbench"><span>02 / Compact & operational</span><h2>Daily workbench</h2><p>Dense tables and clear controls that keep production details close at hand.</p><strong>Explore Workbench →</strong></a>
      <a href="/design-system/guided"><span>03 / Focused & sequential</span><h2>Guided workspace</h2><p>A step-by-step approach to reviewing orders, preparing batches, and packing.</p><strong>Explore Guided →</strong></a>
      <a class="ledger" href="/design-system/ledger"><span>04 / Open & structured</span><h2>Open ledger</h2><p>Square edges, fine rules, and editorial typography with an open layout.</p><strong>Explore Ledger →</strong></a>
    </nav>
    <footer><h2>Looking for individual UI elements?</h2><p>The <a href="/design-system/components">component playground</a> contains isolated button, form, table, and feedback examples.</p></footer>
  </main>
</div>
<style>
  .design-system { min-height:100vh; } main { max-width:1080px; margin:auto; padding:32px 24px 64px; }
  header { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; color:var(--ds-muted); }
  h1 { max-width:700px; font-size:clamp(32px,5vw,52px); line-height:1.15; letter-spacing:-.03em; margin:64px 0 24px; }
  .intro { max-width:750px; font-size:18px; line-height:1.6; } .muted { color:var(--ds-muted); }
  .gallery { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; margin:40px 0; }
  .gallery a { display:flex; flex-direction:column; align-items:flex-start; padding:32px; border:1px solid var(--ds-line); border-radius:8px; background:var(--ds-surface); text-decoration:none; color:var(--ds-ink); }
  .gallery a:hover { border-color:var(--ds-brand); } .gallery span { font-size:13px; color:var(--ds-muted); } h2 { font-size:26px; margin:16px 0 0; } .gallery p { line-height:1.6; flex:1; } .gallery strong { color:var(--ds-brand); margin-top:16px; }
  .studio h2,.ledger h2 { font-family:Georgia,serif; font-weight:400; } .gallery .ledger { border-radius:0; }
  footer { border-top:1px solid var(--ds-line); padding-top:24px; } footer h2 { font-size:20px; } footer a { color:var(--ds-brand); }
  @media(max-width:650px) { .gallery { grid-template-columns:1fr; } main { padding:24px 16px; } h1 { margin-top:40px; } }
</style>
