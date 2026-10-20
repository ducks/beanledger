<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { BatchOverride, Role, Units } from '$lib/types';
  import { units, setUnits } from '$lib/stores/units';
  import { toUnits, parseWeight, unitLabel } from '$lib/calc';

  let {
    onClose,
    onBatchOverridesChange
  }: {
    onClose: () => void;
    onBatchOverridesChange?: () => void;
  } = $props();

  // Local pending value so the radio doesn't fire a save on every click;
  // user must click Save. Initialized from the store on mount.
  let localUnits = $state<Units>($units);
  let saveError = $state('');

  // Batch type weights are stored canonically in lbs but displayed and
  // entered in the user's preferred units. We keep the entry value as a
  // string so partial typing ("2.") doesn't get clobbered by parseFloat.
  let batchTypes = $state<BatchOverride[]>([]);
  let newBatchTypeName = $state('');
  let newBatchTypeWeightInput = $state('20');

  // Team management, owners only. Staff see the member list read-only.
  interface Member { id: string; username: string; email: string; role: Role; email_verified_at: string | null }
  interface Invite { id: string; email: string; role: Role; expires_at: string }
  const me = $derived($page.data.user as { id: string; role: Role } | null);
  const isOwner = $derived(me?.role === 'owner');
  let members = $state<Member[]>([]);
  let invites = $state<Invite[]>([]);
  let inviteEmail = $state('');
  let inviteRole = $state<Role>('staff');
  let teamError = $state('');
  let teamNotice = $state('');

  onMount(async () => {
    await loadBatchTypes();
    await loadTeam();
  });

  async function loadTeam() {
    const usersRes = await fetch('/api/tenant/users');
    if (usersRes.ok) members = (await usersRes.json()).users;
    if (isOwner) {
      const invitesRes = await fetch('/api/tenant/invites');
      if (invitesRes.ok) invites = (await invitesRes.json()).invites;
    }
  }

  async function sendInvite() {
    teamError = '';
    teamNotice = '';
    const res = await fetch('/api/tenant/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
    });
    if (!res.ok) {
      teamError = (await res.json().catch(() => ({}))).error || 'Could not send invitation';
      return;
    }
    teamNotice = `Invitation sent to ${inviteEmail.trim()}`;
    inviteEmail = '';
    await loadTeam();
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/tenant/invites?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadTeam();
  }

  async function changeRole(member: Member, role: Role) {
    teamError = '';
    const res = await fetch('/api/tenant/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, role })
    });
    if (!res.ok) teamError = (await res.json().catch(() => ({}))).error || 'Could not change role';
    await loadTeam();
  }

  async function removeMember(member: Member) {
    if (!confirm(`Remove ${member.username} from this roastery?`)) return;
    teamError = '';
    const res = await fetch(`/api/tenant/users?id=${encodeURIComponent(member.id)}`, { method: 'DELETE' });
    if (!res.ok) teamError = (await res.json().catch(() => ({}))).error || 'Could not remove user';
    await loadTeam();
  }

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
    const lbs = parseWeight(newBatchTypeWeightInput, $units);
    if (!newBatchTypeName.trim() || !isFinite(lbs) || lbs <= 0) return;

    await fetch('/api/batch-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_type: newBatchTypeName.trim().toLowerCase(),
        weight_lbs: lbs
      })
    });

    newBatchTypeName = '';
    newBatchTypeWeightInput = '20';
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

  async function updateBatchType(batchType: string, displayedWeight: string) {
    const lbs = parseWeight(displayedWeight, $units);
    if (!isFinite(lbs) || lbs <= 0) return;
    await fetch('/api/batch-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_type: batchType, weight_lbs: lbs })
    });
    onBatchOverridesChange?.();
  }

  async function save() {
    saveError = '';
    if (localUnits !== $units) {
      try {
        await setUnits(localUnits);
      } catch (err) {
        saveError = err instanceof Error ? err.message : 'Failed to save';
        return;
      }
    }
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
                value={toUnits(batchType.weight_lbs, $units).toFixed(2)}
                onchange={(e) => updateBatchType(batchType.batch_type, e.currentTarget.value)}
                class="batch-input"
              />
              <span class="batch-unit">{unitLabel($units)}</span>
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
            bind:value={newBatchTypeWeightInput}
            placeholder="Weight"
            class="batch-weight-input"
          />
          <span class="batch-unit">{unitLabel($units)}</span>
          <button class="add-button" onclick={addBatchType}>Add</button>
        </div>
      </div>

      <div class="setting-section">
        <div class="setting-label">Team</div>
        <div class="team-list">
          {#each members as member}
            <div class="team-row">
              <span class="team-name">{member.username}</span>
              <span class="team-email">{member.email}{member.email_verified_at ? '' : ' (unverified)'}</span>
              {#if isOwner && member.id !== me?.id}
                <select value={member.role} onchange={(e) => changeRole(member, e.currentTarget.value as Role)}>
                  <option value="owner">owner</option>
                  <option value="staff">staff</option>
                </select>
                <button class="delete-button" onclick={() => removeMember(member)} title="Remove user">×</button>
              {:else}
                <span class="team-role">{member.role}</span>
              {/if}
            </div>
          {/each}
        </div>
        {#if isOwner}
          {#each invites as invite}
            <div class="team-row pending">
              <span class="team-email">{invite.email}</span>
              <span class="team-role">invited as {invite.role}</span>
              <button class="delete-button" onclick={() => revokeInvite(invite.id)} title="Revoke invitation">×</button>
            </div>
          {/each}
          <div class="add-batch-type">
            <input type="email" bind:value={inviteEmail} placeholder="Invite by email" class="batch-name-input" />
            <select bind:value={inviteRole}>
              <option value="staff">staff</option>
              <option value="owner">owner</option>
            </select>
            <button class="add-button" onclick={sendInvite} disabled={!inviteEmail.trim()}>Invite</button>
          </div>
          {#if teamError}<div class="save-error">{teamError}</div>{/if}
          {#if teamNotice}<div class="team-notice">{teamNotice}</div>{/if}
        {/if}
      </div>

      {#if saveError}
        <div class="save-error">{saveError}</div>
      {/if}

      <div class="modal-footer">
        <button class="save-button" onclick={save}>Save</button>
        <button class="cancel-button" onclick={onClose}>Cancel</button>
      </div>
    </div>
  </div>
</div>

<style>
  .team-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
  .team-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
  .team-row.pending { color: var(--text-muted); font-style: italic; }
  .team-name { font-weight: 600; min-width: 90px; }
  .team-email { flex: 1; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; }
  .team-role { color: var(--text-muted); }
  .team-notice { color: var(--success-text); font-size: 13px; margin-top: 6px; }

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

  .save-error {
    color: var(--danger);
    font-size: 13px;
    padding: 8px 0;
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
