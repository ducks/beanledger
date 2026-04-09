<script lang="ts">
  import { onMount } from 'svelte';

  let {
    productionDate,
    onDelete
  }: {
    productionDate: string;
    onDelete: () => void;
  } = $props();

  interface Import {
    id: string;
    filename: string;
    production_date: string;
    imported_at: string;
    order_count: number;
  }

  let imports = $state<Import[]>([]);
  let loading = $state(false);
  let error = $state('');

  onMount(async () => {
    await loadImports();
  });

  $effect(() => {
    // Reload imports when productionDate changes
    productionDate;
    loadImports();
  });

  async function loadImports() {
    try {
      const res = await fetch(`/api/imports?date=${productionDate}`);
      const data = await res.json();
      imports = data.imports || [];
    } catch (err) {
      console.error('Failed to load imports:', err);
      error = 'Failed to load import history';
    }
  }

  // Export public method for parent to call
  export function refresh() {
    loadImports();
  }

  async function handleDelete(importId: string, filename: string) {
    if (!confirm(`Delete import "${filename}"? This will remove all ${imports.find(i => i.id === importId)?.order_count || 0} orders from this import.`)) {
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch(`/api/imports?id=${importId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'Failed to delete import';
        return;
      }

      await loadImports();
      onDelete();
    } catch (err) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
</script>

{#if imports.length > 0}
  <div class="import-history">
    <h3>Import History</h3>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="imports-list">
      {#each imports as imp}
        <div class="import-item">
          <div class="import-info">
            <div class="import-filename">{imp.filename}</div>
            <div class="import-meta">
              {formatDate(imp.imported_at)} • {imp.order_count} order{imp.order_count !== 1 ? 's' : ''}
            </div>
          </div>
          <button
            type="button"
            class="delete-button"
            onclick={() => handleDelete(imp.id, imp.filename)}
            disabled={loading}
          >
            Delete
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .import-history {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--text);
  }

  .error {
    background: var(--danger-bg);
    color: var(--danger);
    padding: 0.75rem;
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .imports-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .import-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.75rem 1rem;
  }

  .import-info {
    flex: 1;
  }

  .import-filename {
    font-weight: 600;
    color: var(--text);
    margin-bottom: 0.25rem;
  }

  .import-meta {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .delete-button {
    padding: 0.5rem 1rem;
    background: var(--danger);
    color: var(--bg);
    border: 1px solid var(--danger);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: var(--font-family);
  }

  .delete-button:hover:not(:disabled) {
    background: var(--danger-hover);
    border-color: var(--danger-hover);
  }

  .delete-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
