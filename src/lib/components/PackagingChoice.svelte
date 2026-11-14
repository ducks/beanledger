<script lang="ts">
  import { onMount } from 'svelte';
  import type { PackagingType } from '$lib/types';
  let { value = $bindable(''), allowLegacy = false, currentLabel = '' }: { value?: string; allowLegacy?: boolean; currentLabel?: string } = $props();
  let options = $state<PackagingType[]>([]);
  let loading = $state(true);
  let error = $state('');
  async function load() {
    loading = true; error = '';
    try {
      const response = await fetch('/api/packaging');
      if (!response.ok) throw new Error('Could not load packaging');
      options = (await response.json()).packaging;
    } catch { error = 'Could not load packaging. Retry before selecting a bag.'; }
    finally { loading = false; }
  }
  onMount(load);
</script>
<label>Packaging
  <select aria-label="Packaging" bind:value required disabled={loading || !!error}>
    <option value="" disabled>Choose packaging…</option>
    {#if allowLegacy}<option value="legacy">Needs review — legacy weight matching</option>{/if}
    {#each options as item}<option value={item.id}>{item.label}</option>{/each}
    {#if value && !['legacy', 'untracked'].includes(value) && !options.some(p => p.id === value)}
      <option value={value} disabled>{currentLabel || 'Selected packaging'} — unavailable; choose another</option>
    {/if}
    <option value="untracked">Untracked / bulk — do not deduct bags</option>
  </select>
</label>
{#if error}<p role="alert">{error} <button type="button" onclick={load}>Retry</button></p>{/if}
<p class="help">One sold unit consumes one selected bag. Coffee weight is separate. Changes affect open orders, not completed inventory records.</p>
{#if value === 'legacy'}<p class="help">This existing product still matches bags by rounded weight until you confirm a choice.</p>{/if}
{#if !loading && !error && !options.length}<p class="help">No packaging is configured. Add it in Packaging inventory, or explicitly choose Untracked / bulk.</p>{/if}
<style>
  label { display:flex; flex-direction:column; gap:.5rem; font-weight:600; }
  select { width:100%; padding:.65rem; font:inherit; color:inherit; background:var(--bg-primary, transparent); border:1px solid var(--border-color, #888); border-radius:4px; }
  .help { font-size:.85rem; line-height:1.5; opacity:.85; }
</style>
