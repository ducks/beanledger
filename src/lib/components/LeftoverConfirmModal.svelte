<script lang="ts">
  import type { RoastGroup } from '$lib/types';
  import type { GroupCalc } from '$lib/calc';
  import { formatWeight } from '$lib/calc';

  let {
    groups,
    leftovers,
    units,
    onConfirm,
    onCancel,
    onUpdateLeftover
  }: {
    groups: Array<RoastGroup & { calc: GroupCalc }>;
    leftovers: Record<string, number>;
    units: 'lbs' | 'kg';
    onConfirm: () => void;
    onCancel: () => void;
    onUpdateLeftover: (groupId: string, value: number) => void;
  } = $props();

  let manuallyChecked = $state<Set<string>>(new Set());

  function handleLeftoverUpdate(groupId: string, value: number) {
    manuallyChecked = new Set(manuallyChecked).add(groupId);
    onUpdateLeftover(groupId, value);
  }

  function handleFocus(groupId: string) {
    manuallyChecked = new Set(manuallyChecked).add(groupId);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Confirm Leftovers</div>
      <button class="close-button" onclick={onCancel}>×</button>
    </div>

    <div class="modal-body">
      <p class="description">Review and adjust leftover quantities before finishing the roast day:</p>

      <div class="leftover-list">
        {#each groups as group}
          {@const isChecked = manuallyChecked.has(group.id)}
          <div class="leftover-item" class:manual-entry={isChecked}>
            <div class="group-label-wrapper">
              {#if isChecked}
                <span class="checkmark">✓</span>
              {/if}
              <div class="group-label">{group.label}</div>
            </div>
            <div class="leftover-input-wrapper">
              <input
                type="number"
                step="0.01"
                class="leftover-input"
                value={leftovers[group.id] ?? group.calc.predictedLeftover ?? 0}
                onfocus={() => handleFocus(group.id)}
                onchange={(e) => handleLeftoverUpdate(group.id, parseFloat(e.currentTarget.value) || 0)}
                onwheel={(e) => e.currentTarget.blur()}
              />
              <span class="unit">lb</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="modal-footer">
      <button class="cancel-button" onclick={onCancel}>Cancel</button>
      <button class="confirm-button" onclick={onConfirm}>
        ✓ Finish Roast Day
      </button>
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
    width: 480px;
    max-height: 88vh;
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
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .description {
    font-size: 12px;
    color: #6b7360;
    margin-bottom: 16px;
    line-height: 1.4;
  }

  .leftover-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .leftover-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #f6f4eb;
    border: 1px solid #c8c4a8;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .leftover-item.manual-entry {
    background: #e8f4e8;
    border-color: #7ba37b;
  }

  .group-label-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .checkmark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: #7ba37b;
    color: #f6f4eb;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }

  .group-label {
    font-size: 12px;
    color: #231f20;
    font-weight: 700;
  }

  .leftover-input-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .leftover-input {
    width: 80px;
    padding: 4px 8px;
    background: #ddd9c4;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    color: #b29244;
    font-family: var(--font-family);
    font-size: 13px;
    text-align: right;
  }

  .leftover-input::-webkit-inner-spin-button,
  .leftover-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .leftover-input[type=number] {
    -moz-appearance: textfield;
  }

  .unit {
    font-size: 10px;
    color: #6b7360;
  }

  .modal-footer {
    padding: 14px 20px;
    border-top: 1px solid #c8c4a8;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .cancel-button {
    padding: 7px 14px;
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

  .confirm-button {
    padding: 7px 14px;
    background: #b29244;
    border: 1px solid #a08239;
    border-radius: 4px;
    color: #f6f4eb;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .confirm-button:hover {
    background: #a08239;
  }
</style>
