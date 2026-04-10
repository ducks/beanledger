<script lang="ts">
  import type { CsvFormat } from '$lib/types';
  import { parseWithConfig } from '$lib/csv/formats/generic';
  import { parseHeaders, splitCsvLine } from '$lib/csv/formats/types';

  let {
    editing,
    onClose,
    onSave
  }: {
    editing: CsvFormat | null;
    onClose: () => void;
    onSave: () => void;
  } = $props();

  // Initialize from editing config
  const editingNameSpec = editing?.config.productNameColumn;
  const isEditingTemplate = editingNameSpec && typeof editingNameSpec === 'object';

  let name = $state(editing?.name ?? '');
  let description = $state(editing?.description ?? '');
  let simpleNameColumn = $state(
    typeof editingNameSpec === 'string' ? editingNameSpec : ''
  );
  let useTemplate = $state(!!isEditingTemplate);
  let nameTemplate = $state(
    isEditingTemplate ? editingNameSpec.template : ''
  );
  let quantityColumn = $state(editing?.config.quantityColumn ?? '');
  let aggregate = $state(editing?.config.aggregate ?? false);

  let sampleCsv = $state('');
  let sampleFilename = $state('');
  let isDragging = $state(false);
  let fileInput = $state<HTMLInputElement>();
  let error = $state('');
  let saving = $state(false);

  // Resolved product name spec based on mode
  const productNameSpec = $derived(
    useTemplate
      ? (nameTemplate ? { template: nameTemplate } : null)
      : (simpleNameColumn || null)
  );

  // Parse the sample CSV to get headers and data rows
  const parsed = $derived.by(() => {
    if (!sampleCsv.trim()) return null;
    try {
      const lines = sampleCsv.trim().split('\n');
      if (lines.length < 2) return { headers: [], rows: [] };
      const headers = parseHeaders(lines[0]);
      const rows = lines.slice(1, 6).map(l => splitCsvLine(l));
      return { headers, rows };
    } catch {
      return null;
    }
  });

  // Live preview of the canonical output
  const preview = $derived.by(() => {
    if (!sampleCsv.trim() || !productNameSpec || !quantityColumn) return null;
    try {
      return parseWithConfig(sampleCsv, {
        productNameColumn: productNameSpec,
        quantityColumn,
        aggregate
      }).slice(0, 10);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Parse error' };
    }
  });

  function loadFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      error = 'Please drop a CSV file';
      return;
    }
    error = '';
    sampleFilename = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      sampleCsv = e.target?.result as string;
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) loadFile(file);
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) isDragging = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  }

  async function save() {
    if (!name.trim()) {
      error = 'Format name is required';
      return;
    }
    if (!productNameSpec || !quantityColumn) {
      error = useTemplate
        ? 'Enter a template and select a quantity column'
        : 'Select both product name and quantity columns';
      return;
    }

    saving = true;
    error = '';

    const data = {
      id: editing?.id ?? `fmt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      description: description.trim() || null,
      config: {
        productNameColumn: productNameSpec,
        quantityColumn,
        aggregate
      },
      active: editing?.active ?? true
    };

    try {
      const res = await fetch('/api/csv-formats', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const body = await res.json();
        error = body.error || 'Failed to save format';
        return;
      }
      onSave();
    } catch (err) {
      error = 'Network error';
    } finally {
      saving = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">{editing ? 'Edit' : 'Add'} CSV Format</div>
      <button class="close-button" onclick={onClose}>×</button>
    </div>

    <div class="modal-body">
      <div class="form-group">
        <label for="fmt-name">Format Name</label>
        <input
          id="fmt-name"
          type="text"
          bind:value={name}
          placeholder="e.g., Square POS Export"
        />
      </div>

      <div class="form-group">
        <label for="fmt-desc">Description (optional)</label>
        <input
          id="fmt-desc"
          type="text"
          bind:value={description}
          placeholder="What is this format used for?"
        />
      </div>

      <div class="form-group">
        <label>Sample CSV</label>
        <div
          class="drop-zone"
          class:dragging={isDragging}
          ondragenter={handleDragEnter}
          ondragleave={handleDragLeave}
          ondragover={handleDragOver}
          ondrop={handleDrop}
          role="button"
          tabindex="0"
          onclick={() => fileInput?.click()}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput?.click()}
        >
          {#if sampleFilename}
            <strong>{sampleFilename}</strong> loaded — drop or click to replace
          {:else}
            Drop a sample CSV here, or <span class="link">click to browse</span>
          {/if}
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          bind:this={fileInput}
          onchange={handleFileSelect}
          style="display: none;"
        />
      </div>

      {#if parsed && parsed.headers.length > 0}
        <div class="form-group">
          <label>Product Name</label>
          <div class="mode-toggle">
            <button
              class="mode-button"
              class:active={!useTemplate}
              onclick={() => useTemplate = false}
            >Single Column</button>
            <button
              class="mode-button"
              class:active={useTemplate}
              onclick={() => useTemplate = true}
            >Combine Columns</button>
          </div>
        </div>

        {#if useTemplate}
          <div class="form-group">
            <label for="fmt-template">Template</label>
            <input
              id="fmt-template"
              type="text"
              bind:value={nameTemplate}
              placeholder="e.g., {'{'}internal_id{'}'} - {'{'}size{'}'}"
            />
            <div class="template-hint">
              Available columns:
              {#each parsed.headers as h, i}
                <button
                  class="column-tag"
                  onclick={() => nameTemplate += `{${h}}`}
                >{h}</button>
              {/each}
            </div>
          </div>
        {:else}
          <div class="form-group">
            <label for="fmt-name-col">Column</label>
            <select id="fmt-name-col" bind:value={simpleNameColumn}>
              <option value="">Select a column</option>
              {#each parsed.headers as h}
                <option value={h}>{h}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="form-group">
          <label for="fmt-qty-col">Quantity Column</label>
          <select id="fmt-qty-col" bind:value={quantityColumn}>
            <option value="">Select a column</option>
            {#each parsed.headers as h}
              <option value={h}>{h}</option>
            {/each}
          </select>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" bind:checked={aggregate} />
            Aggregate duplicate rows (sum quantities for matching product names)
          </label>
        </div>
      {:else if !parsed}
        <div class="form-group">
          <label for="fmt-paste">Or paste CSV text</label>
          <textarea
            id="fmt-paste"
            bind:value={sampleCsv}
            rows="4"
            placeholder="Header1,Header2&#10;value1,value2"
          ></textarea>
        </div>
      {/if}

      {#if preview}
        <div class="preview-section">
          <div class="preview-label">Preview</div>
          {#if 'error' in preview}
            <div class="preview-error">{preview.error}</div>
          {:else if preview.length === 0}
            <div class="preview-empty">No rows parsed. Check your column selection.</div>
          {:else}
            <div class="preview-list">
              {#each preview as row}
                <div class="preview-row">
                  <span class="preview-name">{row.productName}</span>
                  <span class="preview-qty">× {row.quantity}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if error}
        <div class="form-error">{error}</div>
      {/if}
    </div>

    <div class="modal-footer">
      <button class="cancel-button" onclick={onClose} disabled={saving}>Cancel</button>
      <button
        class="save-button"
        onclick={save}
        disabled={saving || !name || !productNameSpec || !quantityColumn}
      >
        {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .modal {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 640px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  }

  .modal-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-size: 15px;
    color: var(--accent);
    font-weight: 700;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .form-group input[type="text"],
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-family);
    font-size: 13px;
  }

  .form-group textarea {
    font-family: monospace;
    resize: vertical;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .mode-toggle {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }

  .mode-button {
    flex: 1;
    padding: 6px 12px;
    background: transparent;
    border: none;
    border-right: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .mode-button:last-child {
    border-right: none;
  }

  .mode-button.active {
    background: var(--accent);
    color: var(--bg);
  }

  .template-hint {
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .column-tag {
    display: inline-block;
    padding: 2px 8px;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: 3px;
    font-size: 11px;
    color: var(--accent);
    cursor: pointer;
    font-family: var(--font-family);
  }

  .column-tag:hover {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--text);
    cursor: pointer;
  }

  .checkbox-group input {
    width: auto;
  }

  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: 6px;
    padding: 1.5rem 1rem;
    background: var(--bg);
    cursor: pointer;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
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

  .drop-zone strong {
    color: var(--text);
  }

  .drop-zone .link {
    color: var(--accent);
    text-decoration: underline;
  }

  .preview-section {
    margin-top: 16px;
    padding: 12px;
    background: var(--bg);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
  }

  .preview-label {
    font-size: 10px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .preview-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    background: var(--bg-raised);
    border-radius: 3px;
    font-size: 12px;
  }

  .preview-name {
    color: var(--text);
  }

  .preview-qty {
    color: var(--accent);
    font-weight: 700;
  }

  .preview-error {
    color: var(--danger);
    font-size: 12px;
  }

  .preview-empty {
    color: var(--text-muted);
    font-size: 12px;
    font-style: italic;
  }

  .form-error {
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--danger-bg);
    color: var(--danger);
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    font-size: 12px;
  }

  .modal-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid var(--border);
  }

  .save-button {
    padding: 8px 16px;
    background: var(--accent);
    border: none;
    border-radius: 4px;
    color: var(--bg);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .save-button:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-button {
    padding: 8px 16px;
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .cancel-button:hover:not(:disabled) {
    background: var(--bg-sunken);
  }
</style>
