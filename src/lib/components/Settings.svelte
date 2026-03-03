<script lang="ts">
  import { onMount } from 'svelte';
  import type { BatchOverride, BatchType } from '$lib/types';
  import { BATCH_WEIGHTS } from '$lib/types';

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
  let batchOverrides = $state<Record<BatchType, number>>({
    standard: BATCH_WEIGHTS.standard,
    dark: BATCH_WEIGHTS.dark,
    decaf: BATCH_WEIGHTS.decaf
  });
  let overridesLoaded = $state(false);

  onMount(async () => {
    await loadBatchOverrides();
  });

  async function loadBatchOverrides() {
    const res = await fetch('/api/batch-overrides');
    const overrides: BatchOverride[] = await res.json();

    // Start with defaults
    batchOverrides = {
      standard: BATCH_WEIGHTS.standard,
      dark: BATCH_WEIGHTS.dark,
      decaf: BATCH_WEIGHTS.decaf
    };

    // Apply any overrides
    for (const override of overrides) {
      batchOverrides[override.batch_type] = override.weight_lbs;
    }
    overridesLoaded = true;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  async function save() {
    // Save unit preference
    onUnitsChange(localUnits);

    // Save batch overrides
    for (const batchType of ['standard', 'dark', 'decaf'] as BatchType[]) {
      const weight = batchOverrides[batchType];
      const defaultWeight = BATCH_WEIGHTS[batchType];

      if (weight !== defaultWeight) {
        // Save override
        await fetch('/api/batch-overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_type: batchType, weight_lbs: weight })
        });
      } else {
        // Delete override (revert to default)
        await fetch(`/api/batch-overrides?batch_type=${batchType}`, {
          method: 'DELETE'
        });
      }
    }

    onBatchOverridesChange?.();
    onClose();
  }

  function resetToDefaults() {
    batchOverrides = {
      standard: BATCH_WEIGHTS.standard,
      dark: BATCH_WEIGHTS.dark,
      decaf: BATCH_WEIGHTS.decaf
    };
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
        <div class="setting-header">
          <div class="setting-label">Batch Sizes (lbs)</div>
          <button class="reset-button" onclick={resetToDefaults}>Reset to Defaults</button>
        </div>
        <div class="batch-info">
          <div class="batch-row">
            <span class="batch-name">Standard</span>
            <input
              type="number"
              step="0.01"
              min="0"
              bind:value={batchOverrides.standard}
              class="batch-input"
            />
          </div>
          <div class="batch-row">
            <span class="batch-name">Dark</span>
            <input
              type="number"
              step="0.01"
              min="0"
              bind:value={batchOverrides.dark}
              class="batch-input"
            />
          </div>
          <div class="batch-row">
            <span class="batch-name">Decaf</span>
            <input
              type="number"
              step="0.01"
              min="0"
              bind:value={batchOverrides.decaf}
              class="batch-input"
            />
          </div>
        </div>
        <div class="note">
          Defaults: Standard {BATCH_WEIGHTS.standard} lb, Dark {BATCH_WEIGHTS.dark} lb, Decaf {BATCH_WEIGHTS.decaf} lb
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
    background: #eae8d8;
    border: 1px solid #c8c4a8;
    border-radius: 8px;
    width: 500px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  }

  .modal-header {
    padding: 14px 20px;
    border-bottom: 1px solid #c8c4a8;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-size: 15px;
    color: #b29244;
    font-weight: 700;
  }

  .close-button {
    background: none;
    border: none;
    color: #6b7360;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
  }

  .close-button:hover {
    color: #231f20;
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
    color: #231f20;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reset-button {
    padding: 4px 10px;
    background: none;
    border: 1px solid #c8c4a8;
    border-radius: 3px;
    color: #6b7360;
    font-size: 10px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .reset-button:hover {
    background: #f6f4eb;
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
    color: #231f20;
    cursor: pointer;
  }

  .radio-option input {
    cursor: pointer;
  }

  .batch-info {
    background: #f6f4eb;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    padding: 12px;
  }

  .batch-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 12px;
  }

  .batch-name {
    color: #6b7360;
  }

  .batch-value {
    color: #231f20;
    font-weight: 600;
  }

  .batch-input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid #c8c4a8;
    border-radius: 3px;
    background: #fff;
    font-size: 12px;
    font-weight: 600;
    color: #231f20;
    font-family: var(--font-family);
    text-align: right;
  }

  .batch-input:focus {
    outline: none;
    border-color: #b29244;
  }

  .note {
    font-size: 10px;
    color: #6b7360;
    font-style: italic;
    margin-top: 8px;
  }

  .modal-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding-top: 16px;
    border-top: 1px solid #d8d4bc;
  }

  .save-button {
    padding: 8px 16px;
    background: #b29244;
    border: none;
    border-radius: 4px;
    color: #f6f4eb;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .save-button:hover {
    background: #9d7d37;
  }

  .cancel-button {
    padding: 8px 16px;
    background: none;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    color: #6b7360;
    font-size: 12px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .cancel-button:hover {
    background: #ddd9c4;
  }
</style>
