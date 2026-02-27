<script lang="ts">
  import type { MatchResult } from '$lib/csv';

  export let productionDate: string;
  export let onImportComplete: () => void;

  let csvText = '';
  let fileInput: HTMLInputElement;
  let loading = false;
  let preview: MatchResult[] | null = null;
  let error = '';
  let stats = { total: 0, matched: 0, fuzzy: 0, unmatched: 0 };

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      csvText = e.target?.result as string;
    };
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!csvText.trim()) {
      error = 'Please upload a CSV file or paste CSV text';
      return;
    }

    loading = true;
    error = '';
    preview = null;

    try {
      const res = await fetch('/api/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          productionDate,
          confirm: false
        })
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Preview failed';
        return;
      }

      preview = data.matches;
      stats = {
        total: data.total,
        matched: data.matches.filter((m: MatchResult) => m.confidence === 'exact').length,
        fuzzy: data.matches.filter((m: MatchResult) => m.confidence === 'fuzzy').length,
        unmatched: data.unmatched
      };
    } catch (err) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }

  async function handleConfirm() {
    if (!preview) return;

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          productionDate,
          confirm: true
        })
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Import failed';
        return;
      }

      alert(`Successfully imported ${data.created} orders!`);
      csvText = '';
      preview = null;
      onImportComplete();
    } catch (err) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }
</script>

<div class="csv-import">
  <h3>Import Orders from CSV</h3>

  <div class="upload-section">
    <button type="button" onclick={() => fileInput.click()} disabled={loading}>
      Choose CSV File
    </button>
    <input
      type="file"
      accept=".csv,text/csv"
      bind:this={fileInput}
      onchange={handleFileSelect}
      style="display: none;"
    />

    <div class="or-divider">or paste CSV text:</div>

    <textarea
      bind:value={csvText}
      placeholder="Item - Name,Item - Qty&#10;&quot;Nano Genji Ethiopia - 10oz&quot;,&quot;4&quot;&#10;..."
      rows="6"
      disabled={loading}
    ></textarea>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <button type="button" onclick={handlePreview} disabled={loading || !csvText.trim()}>
      {loading ? 'Processing...' : 'Preview Import'}
    </button>
  </div>

  {#if preview}
    <div class="preview-section">
      <div class="stats">
        <div class="stat">
          <span class="label">Total:</span>
          <span class="value">{stats.total}</span>
        </div>
        <div class="stat success">
          <span class="label">Matched:</span>
          <span class="value">{stats.matched}</span>
        </div>
        {#if stats.fuzzy > 0}
          <div class="stat warning">
            <span class="label">Fuzzy:</span>
            <span class="value">{stats.fuzzy}</span>
          </div>
        {/if}
        {#if stats.unmatched > 0}
          <div class="stat error">
            <span class="label">Unmatched:</span>
            <span class="value">{stats.unmatched}</span>
          </div>
        {/if}
      </div>

      <div class="preview-table">
        <table>
          <thead>
            <tr>
              <th>CSV Product Name</th>
              <th>Qty</th>
              <th>Matched Product</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each preview as match}
              <tr class={match.confidence}>
                <td>{match.productName}</td>
                <td>{match.quantity}</td>
                <td>
                  {#if match.matchedProduct}
                    {match.matchedProduct.name}
                  {:else}
                    <em>No match found</em>
                  {/if}
                </td>
                <td>
                  {#if match.confidence === 'exact'}
                    <span class="badge success">Exact</span>
                  {:else if match.confidence === 'fuzzy'}
                    <span class="badge warning">Fuzzy</span>
                  {:else}
                    <span class="badge error">None</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="actions">
        {#if stats.unmatched > 0}
          <p class="warning-text">
            Warning: {stats.unmatched} product{stats.unmatched > 1 ? 's' : ''} could not be matched and will be skipped.
          </p>
        {/if}

        <button type="button" onclick={handleConfirm} disabled={loading || stats.matched + stats.fuzzy === 0}>
          Import {stats.matched + stats.fuzzy} Order{stats.matched + stats.fuzzy !== 1 ? 's' : ''}
        </button>
        <button type="button" onclick={() => preview = null} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .csv-import {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #333;
  }

  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .or-divider {
    text-align: center;
    color: #666;
    font-size: 0.9rem;
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9rem;
  }

  button {
    padding: 0.75rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  button:hover:not(:disabled) {
    background: #5568d3;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: #fee;
    color: #c33;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .preview-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #ddd;
  }

  .stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .stat {
    background: #f5f5f5;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    display: flex;
    gap: 0.5rem;
  }

  .stat.success {
    background: #efe;
    color: #363;
  }

  .stat.warning {
    background: #ffe;
    color: #663;
  }

  .stat.error {
    background: #fee;
    color: #c33;
  }

  .stat .label {
    font-weight: 600;
  }

  .preview-table {
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th {
    background: #f5f5f5;
    padding: 0.75rem;
    text-align: left;
    border-bottom: 2px solid #ddd;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid #eee;
  }

  tr.none {
    background: #fafafa;
    color: #999;
  }

  tr.fuzzy {
    background: #fffef0;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge.success {
    background: #efe;
    color: #363;
  }

  .badge.warning {
    background: #ffe;
    color: #663;
  }

  .badge.error {
    background: #fee;
    color: #c33;
  }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .warning-text {
    color: #c33;
    margin: 0;
    flex: 1;
  }
</style>
