<script lang="ts">
  let {
    onDismiss,
    onSettings,
    onCatalog,
    onCsvFormats,
    onStartDay,
    startDisabled = false
  }: {
    onDismiss: () => void;
    onSettings: () => void;
    onCatalog: () => void;
    onCsvFormats: () => void;
    onStartDay: () => void;
    startDisabled?: boolean;
  } = $props();

  let step = $state(0);
  const steps = [
    {
      title: 'Set up your roaster',
      description: 'Choose your weight units in Settings, then add a batch type with the amount of green coffee your roaster can hold. You can add more than one batch type.'
    },
    {
      title: 'Build your catalog',
      description: 'In Catalog, add a roast group for each coffee or blend and select its batch type and roast loss. Then add the products you sell and their package sizes.'
    },
    {
      title: 'Set up an order CSV format',
      description: 'If you import orders, open CSV Formats and choose Add Format. Upload or paste a sample export, select the product name and quantity columns, check the preview, and save. You can then select this format on a roast day. You can also add products manually instead.'
    },
    {
      title: 'Start a roast day',
      description: 'Create a roast day for the orders you want to plan. If another day is active, you can continue it or plan ahead instead.'
    },
    {
      title: 'Add orders and plan your roast',
      description: 'On the roast day, import orders from a CSV or add products manually. Review the green coffee and batches needed, use the Pick List for packing, and finish the day when the roast is complete.'
    }
  ];
</script>

<section class="guide" aria-labelledby="getting-started-title">
  <div class="guide-header">
    <div>
      <p class="eyebrow">A quick walkthrough</p>
      <h2 id="getting-started-title">Get started with BeanLedger</h2>
    </div>
    <button class="dismiss" type="button" onclick={onDismiss} aria-label="Close getting started guide">×</button>
  </div>

  <div class="guide-step" aria-live="polite" aria-atomic="true">
    <p class="progress">Step {step + 1} of {steps.length}</p>
    <h3>{steps[step].title}</h3>
    <p>{steps[step].description}</p>
  </div>

  <div class="guide-actions">
    {#if step === 0}
      <button type="button" class="action" onclick={onSettings}>Open Settings</button>
    {:else if step === 1}
      <button type="button" class="action" onclick={onCatalog}>Open Catalog</button>
    {:else if step === 2}
      <button type="button" class="action" onclick={onCsvFormats}>Open CSV Formats</button>
    {:else if step === 3 || step === 4}
      <button type="button" class="action" onclick={onStartDay} disabled={startDisabled}>Start a roast day</button>
    {/if}
    <div class="navigation">
      {#if step > 0}
        <button type="button" class="secondary" onclick={() => step--}>Back</button>
      {/if}
      {#if step < steps.length - 1}
        <button type="button" class="secondary" onclick={() => step++}>Next</button>
      {:else}
        <button type="button" class="secondary" onclick={onDismiss}>Done</button>
      {/if}
    </div>
  </div>
  <p class="note">Take these steps at your own pace. Reopen this guide from the dashboard anytime.</p>
</section>

<style>
  .guide { padding: 1.4rem; margin-bottom: 1.5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-raised); color: var(--text); }
  .guide-header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
  .eyebrow, .progress { color: var(--text-muted); font-size: .8rem; margin: 0 0 .35rem; }
  .eyebrow { text-transform: uppercase; letter-spacing: .06em; font-weight: 700; }
  h2 { font-size: 1.2rem; margin: 0; }
  h3 { font-size: 1rem; margin: 0 0 .5rem; }
  .guide-step { margin: 1.2rem 0; max-width: 45rem; }
  .guide-step > p:last-child { line-height: 1.5; margin: 0; }
  .dismiss { border: 0; background: transparent; color: var(--text); font-size: 1.5rem; line-height: 1; cursor: pointer; padding: .25rem; }
  .guide-actions, .navigation { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
  .navigation { margin-left: auto; }
  .guide-actions button { border-radius: 5px; padding: .55rem .8rem; font: inherit; font-size: .85rem; cursor: pointer; }
  .action { background: var(--text); border: 1px solid var(--text); color: var(--bg); }
  .secondary { background: transparent; border: 1px solid var(--border); color: var(--text); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .note { color: var(--text-muted); font-size: .8rem; margin: 1rem 0 0; }
  @media (max-width: 480px) { .navigation { margin-left: 0; } .guide-actions { justify-content: space-between; } }
</style>
