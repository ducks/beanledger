<script lang="ts">
  import { onMount } from 'svelte';
  import type { MatchResult } from '$lib/csv';
  import { skuToGroupLabel, parseLbsFromSkuName } from '$lib/csv';
  import type { RoastGroup, BatchOverride, Product } from '$lib/types';

  let {
    productionDate,
    onImportComplete
  }: {
    productionDate: string;
    onImportComplete: () => void;
  } = $props();

  let csvText = $state('');
  let filename = $state<string>('');
  let fileInput = $state<HTMLInputElement>();
  let loading = $state(false);
  let preview = $state<MatchResult[] | null>(null);
  let error = $state('');
  let stats = $state({ total: 0, matched: 0, fuzzy: 0, unmatched: 0 });
  let groups = $state<RoastGroup[]>([]);
  let products = $state<Product[]>([]);
  let batchTypes = $state<BatchOverride[]>([]);
  let ignoredSkus = $state<string[]>([]);
  let addingSkus = $state<Record<string, { lbs: number; groupId: string; creatingNewGroup: boolean; newGroupLabel: string; newGroupBatchType: string; newGroupRoastLoss: number; newGroupType: 'blend' | 'single_origin' }>>({});
  let manualMatches = $state<Record<string, string>>({});
  let isDragging = $state(false);

  onMount(async () => {
    await loadGroups();
    await loadProducts();
    await loadBatchTypes();

    // Warn if no batch types exist
    if (batchTypes.length === 0) {
      console.warn('No batch types found. Users must create batch types in Settings before creating groups.');
    }
  });

  async function loadGroups() {
    const res = await fetch('/api/groups');
    groups = await res.json();
  }

  async function loadProducts() {
    const res = await fetch('/api/products');
    products = await res.json();
  }

  async function loadBatchTypes() {
    const res = await fetch('/api/batch-overrides');
    batchTypes = await res.json();
  }

  const unmatchedProducts = $derived(
    preview?.filter(m => m.confidence === 'none' && !ignoredSkus.includes(m.productName)) || []
  );

  function startAddSku(productName: string) {
    const lbs = parseLbsFromSkuName(productName);
    const suggestedLabel = skuToGroupLabel(productName);
    const suggestedGroup = groups.find(g => g.label.toLowerCase().includes(suggestedLabel.toLowerCase()));

    addingSkus = {
      ...addingSkus,
      [productName]: {
        lbs: lbs || 0,
        groupId: suggestedGroup?.id || groups[0]?.id || '',
        creatingNewGroup: false,
        newGroupLabel: suggestedLabel,
        newGroupBatchType: batchTypes[0]?.batch_type || '',
        newGroupRoastLoss: 15,
        newGroupType: 'single_origin'
      }
    };
  }

  async function confirmAddSku(productName: string) {
    const formData = addingSkus[productName];
    if (!formData) {
      console.error('No form data for product:', productName);
      return;
    }

    // Clear previous errors
    error = '';

    try {
      let groupId = formData.groupId;

      // Create new group if needed
      if (formData.creatingNewGroup) {
        if (!formData.newGroupLabel.trim()) {
          error = 'Group label is required';
          return;
        }

        if (!formData.newGroupBatchType) {
          error = 'Batch type is required. Please create batch types in Settings first.';
          return;
        }

        const newGroupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newGroup = {
          id: newGroupId,
          label: formData.newGroupLabel,
          batch_type: formData.newGroupBatchType,
          roast_loss_pct: formData.newGroupRoastLoss,
          type: formData.newGroupType,
          components: [],
          active: true,
          created_at: new Date().toISOString().slice(0, 10)
        };

        console.log('Creating group:', newGroup);

        const groupRes = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newGroup)
        });

        if (!groupRes.ok) {
          const errorText = await groupRes.text();
          error = `Failed to create group: ${errorText}`;
          console.error('Group creation failed:', errorText);
          return;
        }

        groupId = newGroupId;

        // Reload groups to include the new one
        await loadGroups();
      }

      if (!groupId) {
        error = 'Please select or create a group';
        return;
      }

      // Create product
      const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newProduct = {
        id: productId,
        name: productName,
        lbs: formData.lbs,
        group_id: groupId,
        active: true,
        created_at: new Date().toISOString().slice(0, 10)
      };

      const productRes = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });

      if (!productRes.ok) {
        error = `Failed to create product: ${await productRes.text()}`;
        return;
      }

      // Remove from adding state
      const { [productName]: _, ...rest } = addingSkus;
      addingSkus = rest;

      // Re-run preview to pick up the new product
      await handlePreview();
    } catch (err) {
      error = `Failed to create product: ${err instanceof Error ? err.message : String(err)}`;
      console.error('Error creating product:', err);
    }
  }

  function ignoreSku(productName: string) {
    ignoredSkus = [...ignoredSkus, productName];
    const { [productName]: _, ...rest } = addingSkus;
    addingSkus = rest;
  }

  function cancelAddSku(productName: string) {
    const { [productName]: _, ...rest } = addingSkus;
    addingSkus = rest;
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    loadFile(file);
  }

  function loadFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      error = 'Please drop a CSV file';
      return;
    }

    error = '';
    filename = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      csvText = e.target?.result as string;
    };
    reader.readAsText(file);
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Only un-highlight when leaving the drop zone itself, not child elements
    if (e.currentTarget === e.target) {
      isDragging = false;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    if (loading) return;

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      loadFile(file);
    }
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
        matched: data.matches.filter((m: MatchResult) => m.confidence === 'exact' || m.confidence === 'alias').length,
        fuzzy: 0,
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
          filename: filename || 'pasted.csv',
          confirm: true,
          manualMatches
        })
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Import failed';
        return;
      }

      alert(`Successfully imported ${data.created} order(s)!`);
      csvText = '';
      filename = '';
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
    <div
      class="drop-zone"
      class:dragging={isDragging}
      ondragenter={handleDragEnter}
      ondragleave={handleDragLeave}
      ondragover={handleDragOver}
      ondrop={handleDrop}
      role="button"
      tabindex="0"
      onclick={() => !loading && fileInput?.click()}
      onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !loading && fileInput?.click()}
    >
      <div class="drop-zone-content">
        <div class="drop-zone-icon">📄</div>
        <div class="drop-zone-text">
          {#if isDragging}
            Drop CSV file here
          {:else if filename}
            <strong>{filename}</strong> loaded — drop or click to replace
          {:else}
            Drop CSV file here, or <span class="link">click to browse</span>
          {/if}
        </div>
      </div>
    </div>
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
        {#if stats.unmatched > 0}
          <div class="stat error">
            <span class="label">Unmatched:</span>
            <span class="value">{stats.unmatched}</span>
          </div>
        {/if}
      </div>

      {#if unmatchedProducts.length > 0}
        <div class="unmatched-section">
          <h4>Unmapped Products ({unmatchedProducts.length})</h4>
          <p class="help-text">These products were not found in your catalog. Add them or ignore to continue.</p>

          {#each unmatchedProducts as match}
            <div class="unmatched-product">
              <div class="product-header">
                <strong>{match.productName}</strong>
                <span class="qty-badge">Qty: {match.quantity}</span>
              </div>

              {#if addingSkus[match.productName]}
                {@const formData = addingSkus[match.productName]}
                <div class="add-form">
                  <div class="form-row">
                    <label>
                      Weight (lbs):
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={formData.lbs}
                        class="weight-input"
                      />
                    </label>
                    <label>
                      Roast Group:
                      <select
                        bind:value={formData.groupId}
                        onchange={(e) => {
                          const target = e.target as HTMLSelectElement;
                          formData.creatingNewGroup = target.value === '__new__';
                        }}
                        class="group-select"
                      >
                        <option value="__new__">+ Create New Group</option>
                        {#each groups as group}
                          <option value={group.id}>{group.label}</option>
                        {/each}
                      </select>
                    </label>
                  </div>

                  {#if formData.creatingNewGroup}
                    <div class="new-group-form">
                      <h5>New Group Details</h5>
                      <div class="form-row">
                        <label>
                          Group Label:
                          <input
                            type="text"
                            bind:value={formData.newGroupLabel}
                            placeholder="e.g., Ethiopia Natural"
                            class="text-input"
                          />
                        </label>
                        <label>
                          Type:
                          <select bind:value={formData.newGroupType} class="select-input">
                            <option value="single_origin">Single Origin</option>
                            <option value="blend">Blend</option>
                          </select>
                        </label>
                      </div>
                      <div class="form-row">
                        <label>
                          Batch Type:
                          <select bind:value={formData.newGroupBatchType} class="select-input">
                            {#each batchTypes as batchType}
                              <option value={batchType.batch_type}>
                                {batchType.batch_type} ({batchType.weight_lbs} lb)
                              </option>
                            {/each}
                          </select>
                        </label>
                        <label>
                          Roast Loss %:
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            bind:value={formData.newGroupRoastLoss}
                            class="number-input"
                          />
                        </label>
                      </div>
                    </div>
                  {/if}

                  <div class="form-actions">
                    <button type="button" class="btn-confirm" onclick={() => confirmAddSku(match.productName)}>
                      {formData.creatingNewGroup ? 'Create Group & Add Product' : 'Confirm Add'}
                    </button>
                    <button type="button" class="btn-cancel" onclick={() => cancelAddSku(match.productName)}>
                      Cancel
                    </button>
                  </div>
                </div>
              {:else}
                <div class="product-actions">
                  <button type="button" class="btn-add" onclick={() => startAddSku(match.productName)}>
                    Add to Catalog
                  </button>
                  <button type="button" class="btn-ignore" onclick={() => ignoreSku(match.productName)}>
                    Ignore
                  </button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

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
                    <span class="badge success">Matched</span>
                  {:else if match.confidence === 'alias'}
                    <span class="badge success">Alias</span>
                  {:else}
                    <span class="badge error">Not Found</span>
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

        <button type="button" onclick={handleConfirm} disabled={loading || stats.matched === 0}>
          Import {stats.matched} Order{stats.matched !== 1 ? 's' : ''}
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

  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: 8px;
    padding: 2rem 1rem;
    background: var(--bg);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .drop-zone:hover {
    border-color: var(--accent);
    background: var(--bg-sunken);
  }

  .drop-zone.dragging {
    border-color: var(--accent);
    background: var(--bg-accent);
  }

  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    pointer-events: none;
  }

  .drop-zone-icon {
    font-size: 2rem;
    opacity: 0.6;
  }

  .drop-zone-text {
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .drop-zone-text strong {
    color: var(--text);
  }

  .drop-zone-text .link {
    color: var(--accent);
    text-decoration: underline;
  }

  .or-divider {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font-family: monospace;
    font-size: 0.9rem;
  }

  button {
    padding: 0.75rem 1rem;
    background: var(--text);
    color: var(--bg);
    border: 1px solid var(--text);
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-family: var(--font-family);
    font-weight: 600;
  }

  button:hover:not(:disabled) {
    background: var(--button-dark-hover);
    border-color: var(--button-dark-hover);
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: var(--danger-bg);
    color: var(--danger);
    padding: 0.75rem;
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .preview-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
  }

  .stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .stat {
    background: var(--bg-sunken);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    display: flex;
    gap: 0.5rem;
    border: 1px solid var(--border);
  }

  .stat.success {
    background: #d4e4d0;
    color: #3d5a3c;
    border-color: #a8c4a2;
  }

  .stat.warning {
    background: var(--bg-accent);
    color: #8b6914;
    border-color: #d4c49c;
  }

  .stat.error {
    background: var(--danger-bg);
    color: var(--danger);
    border-color: var(--danger-border);
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
    background: var(--border-subtle);
    padding: 0.75rem;
    text-align: left;
    border-bottom: 2px solid var(--border);
    color: var(--text);
    font-weight: 600;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text);
  }

  tr.alias {
    background: var(--bg);
  }

  tr.none {
    background: var(--bg);
    color: var(--text-muted);
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
    background: #d4e4d0;
    color: #3d5a3c;
  }

  .badge.warning {
    background: var(--bg-accent);
    color: #8b6914;
  }

  .badge.error {
    background: var(--danger-bg);
    color: var(--danger);
  }

  .actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .warning-text {
    color: var(--danger);
    margin: 0;
    flex: 1;
  }

  .unmatched-section {
    background: var(--bg-accent);
    border: 1px solid #d4c49c;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .unmatched-section h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #8b6914;
    font-weight: 600;
  }

  .help-text {
    margin: 0 0 1rem 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .unmatched-product {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .unmatched-product:last-child {
    margin-bottom: 0;
  }

  .product-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .qty-badge {
    background: var(--border-subtle);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text);
  }

  .product-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-add,
  .btn-ignore,
  .btn-confirm,
  .btn-cancel {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .btn-add {
    background: var(--accent);
    color: var(--bg);
    border: 1px solid var(--accent);
  }

  .btn-add:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }

  .btn-ignore {
    background: var(--muted-green);
    color: var(--bg);
    border: 1px solid var(--muted-green);
  }

  .btn-ignore:hover {
    background: var(--muted-green-hover);
    border-color: var(--muted-green-hover);
  }

  .btn-confirm {
    background: var(--accent);
    color: var(--bg);
    border: 1px solid var(--accent);
  }

  .btn-confirm:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }

  .btn-cancel {
    background: var(--bg-sunken);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .btn-cancel:hover {
    background: var(--border-subtle);
    border-color: #b8b4a0;
  }

  .add-form {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #eee;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .form-row label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #555;
  }

  .weight-input,
  .group-select {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text);
    font-size: 0.9rem;
    font-family: var(--font-family);
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
  }

  .new-group-form {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .new-group-form h5 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    color: var(--text);
    font-weight: 600;
  }

  .text-input,
  .select-input,
  .number-input {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text);
    font-size: 0.9rem;
    width: 100%;
    font-family: var(--font-family);
  }

  .text-input::placeholder {
    color: var(--text-muted);
  }
</style>
