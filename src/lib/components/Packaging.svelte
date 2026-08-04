<script lang="ts">
  import { onMount } from 'svelte';
  import type { PackagingType, UntrackedPackagingRequirement } from '$lib/types';
  import { formatPackageSizeGrams } from '$lib/calc';
  import { units } from '$lib/stores/units';

  let {
    productionDate,
    onClose
  }: {
    productionDate?: string;
    onClose: () => void;
  } = $props();

  let packaging = $state<PackagingType[]>([]);
  let untracked = $state<UntrackedPackagingRequirement[]>([]);
  let dayStatus = $state<string | null>(null);
  let loading = $state(false);
  let error = $state('');
  let label = $state('');
  let capacity = $state<number | undefined>(undefined);
  let count = $state<number | undefined>(undefined);
  let draftCounts = $state<Record<string, number>>({});

  onMount(loadPackaging);

  async function loadPackaging() {
    loading = true;
    error = '';
    try {
      const params = productionDate ? `?date=${encodeURIComponent(productionDate)}` : '';
      const response = await fetch(`/api/packaging${params}`);
      if (!response.ok) throw new Error('Unable to load packaging inventory');
      const data = await response.json();
      packaging = data.packaging ?? [];
      untracked = data.untracked ?? [];
      dayStatus = data.day_status ?? null;
      draftCounts = Object.fromEntries(
        packaging.map((item) => [item.id, item.on_hand_count])
      );
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to load packaging inventory';
    } finally {
      loading = false;
    }
  }

  async function addPackaging() {
    if (!label.trim() || capacity == null || !Number.isFinite(capacity) || capacity <= 0 || !Number.isInteger(count)) return;
    loading = true;
    error = '';
    try {
      const response = await fetch('/api/packaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          size_value: capacity,
          size_unit: $units === 'kg' ? 'g' : 'oz',
          on_hand_count: count
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to add packaging');
      label = '';
      capacity = undefined;
      count = undefined;
      await loadPackaging();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to add packaging';
      loading = false;
    }
  }

  async function saveCount(item: PackagingType) {
    const onHandCount = draftCounts[item.id];
    if (!Number.isInteger(onHandCount) || onHandCount < 0) {
      error = 'Inventory count must be a non-negative whole number';
      return;
    }
    loading = true;
    error = '';
    try {
      const response = await fetch('/api/packaging', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, label: item.label, on_hand_count: onHandCount })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update packaging');
      await loadPackaging();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to update packaging';
      loading = false;
    }
  }

  async function archivePackaging(item: PackagingType) {
    if (!confirm(`Remove ${item.label} from packaging inventory?`)) return;
    loading = true;
    error = '';
    try {
      const response = await fetch(`/api/packaging?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to remove packaging');
      await loadPackaging();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Unable to remove packaging';
      loading = false;
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose();
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal">
    <div class="modal-header">
      <div>
        <div class="modal-title">Packaging Inventory</div>
        {#if productionDate}
          <div class="modal-subtitle">Order-sheet usage for {productionDate}</div>
        {/if}
      </div>
      <button class="close-button" onclick={onClose}>×</button>
    </div>

    <div class="modal-body">
      {#if error}<div class="error">{error}</div>{/if}

      <form class="add-form" onsubmit={(event) => { event.preventDefault(); addPackaging(); }}>
        <label>
          <span>Bag type</span>
          <input bind:value={label} placeholder="12 oz kraft" />
        </label>
        <label>
          <span>Capacity ({$units === 'kg' ? 'g' : 'oz'})</span>
          <input type="number" min="0.1" step={$units === 'kg' ? '1' : '0.1'} bind:value={capacity} onwheel={(e) => e.currentTarget.blur()} />
        </label>
        <label>
          <span>Count on hand</span>
          <input type="number" min="0" step="1" bind:value={count} onwheel={(e) => e.currentTarget.blur()} />
        </label>
        <button class="primary-button" type="submit" disabled={loading || !label.trim() || !Number.isFinite(capacity) || (capacity ?? 0) <= 0 || !Number.isInteger(count)}>
          Add bag type
        </button>
      </form>

      {#if untracked.length > 0}
        <div class="warning">
          <strong>Packaging not configured:</strong>
          {untracked.map((item) => `${item.required_count} × ${formatPackageSizeGrams(item.size_grams, $units)}`).join(', ')}
        </div>
      {/if}

      {#if loading && packaging.length === 0}
        <div class="empty">Loading packaging…</div>
      {:else if packaging.length === 0}
        <div class="empty">Add the bag sizes you keep in stock. Product weights will match them automatically.</div>
      {:else}
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Bag type</th>
                <th>Size</th>
                {#if dayStatus === 'completed'}
                  <th>Starting</th>
                  <th>Filled</th>
                  <th>Remaining</th>
                {:else}
                  <th>On hand</th>
                  {#if productionDate}<th>Ordered</th><th>Projected</th>{/if}
                {/if}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each packaging as item}
                <tr>
                  <td class="bag-label">{item.label}</td>
                  <td>{formatPackageSizeGrams(item.size_grams, $units)}</td>
                  {#if dayStatus === 'completed'}
                    <td>{item.starting_count ?? '—'}</td>
                    <td>{item.filled_count ?? 0}</td>
                    <td class:short={(item.ending_count ?? 0) < 0}>{item.ending_count ?? '—'}</td>
                  {:else}
                    <td>
                      <div class="count-editor">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={draftCounts[item.id]}
                          onchange={(event) => { draftCounts[item.id] = Number(event.currentTarget.value); }}
                          onwheel={(e) => e.currentTarget.blur()}
                        />
                        <button disabled={loading || draftCounts[item.id] === item.on_hand_count} onclick={() => saveCount(item)}>Save</button>
                      </div>
                    </td>
                    {#if productionDate}
                      <td>{item.required_count ?? 0}</td>
                      <td class:short={(item.projected_remaining ?? 0) < 0}>{item.projected_remaining ?? item.on_hand_count}</td>
                    {/if}
                  {/if}
                  <td><button class="archive" onclick={() => archivePackaging(item)} title="Remove bag type">×</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      {#if productionDate && dayStatus !== 'completed'}
        <p class="note">Projected inventory follows the current order sheet. Counts are deducted once when the roast day is finished.</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.78); display: flex; align-items: center; justify-content: center; z-index: 1100; }
  .modal { width: min(900px, 94vw); max-height: 88vh; display: flex; flex-direction: column; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,.7); }
  .modal-header { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); }
  .modal-title { color: var(--accent); font-size: 15px; font-weight: 700; }
  .modal-subtitle { margin-top: 3px; color: var(--text-muted); font-size: 10px; }
  .close-button { border: 0; background: none; color: var(--text-muted); font-size: 22px; cursor: pointer; }
  .modal-body { padding: 20px; overflow-y: auto; }
  .add-form { display: grid; grid-template-columns: minmax(180px, 1fr) 130px 150px auto; gap: 10px; align-items: end; margin-bottom: 20px; }
  label span { display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }
  input { width: 100%; box-sizing: border-box; padding: 8px 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; color: var(--text); font-family: inherit; }
  .primary-button, .count-editor button { padding: 8px 12px; border: 1px solid var(--accent); border-radius: 4px; background: var(--accent); color: var(--bg); font-family: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .warning, .error { margin-bottom: 16px; padding: 10px 12px; border-radius: 4px; font-size: 11px; }
  .warning { border: 1px solid var(--warning, #c69a45); color: var(--warning, #d6ad5c); background: rgba(198,154,69,.08); }
  .error { border: 1px solid var(--danger, #c65f5f); color: var(--danger, #d87373); }
  .table-container { border: 1px solid var(--border); border-radius: 5px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; background: var(--bg); }
  th, td { padding: 10px 12px; text-align: right; border-bottom: 1px solid var(--border); font-size: 11px; }
  th:first-child, td:first-child { text-align: left; }
  th { color: var(--text-muted); font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }
  tbody tr:last-child td { border-bottom: 0; }
  .bag-label { color: var(--text); font-weight: 600; }
  .count-editor { display: flex; justify-content: flex-end; gap: 5px; }
  .count-editor input { width: 82px; text-align: right; padding: 5px 7px; }
  .count-editor button { padding: 5px 8px; font-size: 9px; }
  .archive { border: 0; background: none; color: var(--text-muted); font-size: 17px; cursor: pointer; }
  .short { color: var(--danger, #d87373); font-weight: 700; }
  .empty { padding: 30px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 5px; }
  .note { margin: 14px 0 0; color: var(--text-muted); font-size: 10px; }
  @media (max-width: 760px) { .add-form { grid-template-columns: 1fr 1fr; } }
</style>
