<script lang="ts">
  import { onMount } from 'svelte';
  import type { BatchOverride } from '$lib/types';

  let {
    units,
    onClose,
    onUnitsChange,
    onBatchOverridesChange
  }: {
    units: 'lbs' | 'kg';
    onClose: () => void;
    onUnitsChange: (newUnits: 'lbs' | 'kg') => void;
    onBatchOverridesChange?: () => void;
  } = $props();

  let localUnits = $state(units);
  let batchTypes = $state<BatchOverride[]>([]);
  let newBatchTypeName = $state('');
  let newBatchTypeWeight = $state(20);

  onMount(async () => {
    await loadBatchTypes();
  });

  async function loadBatchTypes() {
    const res = await fetch('/api/batch-overrides');
    batchTypes = await res.json();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  async function addBatchType() {
    if (!newBatchTypeName.trim() || newBatchTypeWeight <= 0) return;

    await fetch('/api/batch-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_type: newBatchTypeName.trim().toLowerCase(),
        weight_lbs: newBatchTypeWeight
      })
    });

    newBatchTypeName = '';
    newBatchTypeWeight = 20;
    await loadBatchTypes();
    onBatchOverridesChange?.();
  }

  async function deleteBatchType(batchType: string) {
    await fetch(`/api/batch-overrides?batch_type=${batchType}`, {
      method: 'DELETE'
    });
    await loadBatchTypes();
    onBatchOverridesChange?.();
  }

  async function updateBatchType(batchType: string, weight: number) {
    await fetch('/api/batch-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_type: batchType, weight_lbs: weight })
    });
    onBatchOverridesChange?.();
  }

  function save() {
    onUnitsChange(localUnits);
    onClose();
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Settings</div>
      <button class="close-button" onclick={onClose}>×</button>
    </div>

    <div class="modal-body">
      <div class="setting-section">
        <div class="setting-label">Weight Units</div>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" name="units" value="lbs" bind:group={localUnits} />
            <span>Pounds (lbs)</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="units" value="kg" bind:group={localUnits} />
            <span>Kilograms (kg)</span>
          </label>
        </div>
      </div>

      <div class="setting-section">
        <div class="setting-label">Batch Types</div>

        <div class="batch-types-list">
          {#each batchTypes as batchType}
            <div class="batch-row">
              <span class="batch-name">{batchType.batch_type}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={batchType.weight_lbs}
                onchange={(e) => updateBatchType(batchType.batch_type, parseFloat(e.currentTarget.value))}
                class="batch-input"
              />
              <span class="batch-unit">lbs</span>
              <button
                class="delete-button"
                onclick={() => deleteBatchType(batchType.batch_type)}
                title="Delete batch type"
              >×</button>
            </div>
          {/each}
        </div>

        <div class="add-batch-type">
          <input
            type="text"
            bind:value={newBatchTypeName}
            placeholder="New batch type (e.g., light)"
            class="batch-name-input"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            bind:value={newBatchTypeWeight}
            placeholder="Weight"
            class="batch-weight-input"
          />
          <span class="batch-unit">lbs</span>
          <button class="add-button" onclick={addBatchType}>Add</button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="save-button" onclick={save}>Save</button>
        <button class="cancel-button" onclick={onClose}>Cancel</button>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 500px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
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

  .close-button:hover {
    color: var(--text);
  }

  .modal-body {
    padding: 20px;
  }

  .setting-section {
    margin-bottom: 24px;
  }

  .setting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .setting-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reset-button {
    padding: 4px 10px;
    background: none;
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text-muted);
    font-size: 10px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .reset-button:hover {
    background: var(--bg);
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text);
    cursor: pointer;
  }

  .radio-option input {
    cursor: pointer;
  }

  .batch-info {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 12px;
  }

  .batch-types-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .batch-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 12px;
  }

  .batch-name {
    flex: 1;
    color: var(--text);
    font-weight: 600;
    text-transform: capitalize;
  }

  .batch-unit {
    color: var(--text-muted);
    font-size: 11px;
  }

  .batch-value {
    color: var(--text);
    font-weight: 600;
  }

  .batch-input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: #fff;
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    font-family: var(--font-family);
    text-align: right;
  }

  .batch-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .delete-button {
    width: 24px;
    height: 24px;
    padding: 0;
    background: var(--danger);
    color: var(--bg);
    border: none;
    border-radius: 3px;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .delete-button:hover {
    background: #a34a38;
  }

  .add-batch-type {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: var(--border-subtle);
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .batch-name-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-family);
  }

  .batch-weight-input {
    width: 80px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    font-family: var(--font-family);
    text-align: right;
  }

  .batch-name-input:focus,
  .batch-weight-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .add-button {
    padding: 6px 14px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .add-button:hover {
    background: var(--accent-hover);
  }

  .note {
    font-size: 10px;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 8px;
  }

  .modal-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding-top: 16px;
    border-top: 1px solid var(--border-subtle);
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

  .save-button:hover {
    background: var(--accent-hover);
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

  .cancel-button:hover {
    background: var(--bg-sunken);
  }
</style>
