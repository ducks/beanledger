<script lang="ts">
  let {
    units,
    onClose,
    onUnitsChange
  }: {
    units: 'lbs' | 'kg';
    onClose: () => void;
    onUnitsChange: (newUnits: 'lbs' | 'kg') => void;
  } = $props();

  let localUnits = $state(units);

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
        <div class="setting-label">Batch Sizes</div>
        <div class="batch-info">
          <div class="batch-row">
            <span class="batch-name">Large (Standard)</span>
            <span class="batch-value">20.2 lb</span>
          </div>
          <div class="batch-row">
            <span class="batch-name">Medium (Dark)</span>
            <span class="batch-value">19.8 lb</span>
          </div>
          <div class="batch-row">
            <span class="batch-name">Small (Decaf)</span>
            <span class="batch-value">10.73 lb</span>
          </div>
        </div>
        <div class="note">Batch sizes are configured per roast group</div>
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

  .setting-label {
    font-size: 11px;
    font-weight: 600;
    color: #231f20;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 10px;
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
