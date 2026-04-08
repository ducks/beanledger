<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Catalog from './Catalog.svelte';
  import Settings from './Settings.svelte';

  interface ProductionDay {
    production_date: string;
    status: 'active' | 'scheduled' | 'completed';
    created_at: string;
    completed_at: string | null;
  }

  let days = $state<ProductionDay[]>([]);
  let loading = $state(false);
  let error = $state('');
  let showNewDayModal = $state(false);
  let newDayDate = $state(new Date().toISOString().slice(0, 10));
  let activeDay: ProductionDay | null = $state(null);
  let showCatalog = $state(false);
  let showSettings = $state(false);
  let units = $state<'lbs' | 'kg'>('lbs');

  onMount(async () => {
    await loadDays();
  });

  async function loadDays() {
    try {
      const res = await fetch('/api/production-days');
      const data = await res.json();
      days = data.days || [];
      activeDay = days.find(d => d.status === 'active') || null;
    } catch (err) {
      console.error('Failed to load production days:', err);
      error = 'Failed to load production days';
    }
  }

  async function startNewDay() {
    // Reset date to today
    newDayDate = new Date().toISOString().slice(0, 10);

    // Check if there's an active day
    if (activeDay) {
      showNewDayModal = true;
      return;
    }

    // Check if today already has a day
    const todayDay = days.find(d => d.production_date === newDayDate);
    if (todayDay) {
      // Today already has a day, show modal to pick a different date
      showNewDayModal = true;
      return;
    }

    await createNewDay('active');
  }

  async function createNewDay(status: 'active' | 'scheduled' = 'active') {
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/production-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ production_date: newDayDate, status })
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409 && data.activeDay) {
          // There's already an active day, show the modal
          await loadDays();
          showNewDayModal = true;
          return;
        }
        error = data.error || 'Failed to create production day';
        return;
      }

      showNewDayModal = false;
      await loadDays();
      // Navigate to the new day
      goto(`/planner?date=${newDayDate}`);
    } catch (err) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }

  async function finishActiveAndStartNew() {
    if (!activeDay) return;

    loading = true;
    error = '';

    try {
      // Finish the active day
      await fetch(`/api/production-days/${activeDay.production_date}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      // Create new day
      await createNewDay('active');
    } catch (err) {
      error = 'Failed to finish active day';
    } finally {
      loading = false;
    }
  }

  async function deleteDay(date: string) {
    if (!confirm('Delete this roast day? This cannot be undone.')) return;

    loading = true;
    error = '';

    try {
      const res = await fetch(`/api/production-days/${date}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await loadDays();
      } else {
        const data = await res.json();
        error = data.error || 'Failed to delete roast day';
      }
    } catch (err) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      active: { emoji: '🟢', label: 'Active', class: 'status-active' },
      scheduled: { emoji: '📅', label: 'Scheduled', class: 'status-scheduled' },
      completed: { emoji: '✅', label: 'Completed', class: 'status-completed' }
    };
    return badges[status as keyof typeof badges] || { emoji: '', label: status, class: '' };
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return 'Invalid Date';
    // Parse YYYY-MM-DD format and create date in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTimestamp(timestamp: string | null) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
</script>

<div class="dashboard">
  <header>
    <h1>BeanLedger</h1>
    <div class="header-actions">
      <button class="action-button" onclick={() => showCatalog = true}>
        ⚙ Catalog
      </button>
      <button class="action-button" onclick={() => showSettings = true}>
        ⚙ Settings
      </button>
      <button class="primary-button" onclick={startNewDay} disabled={loading}>
        + Start New Roast Day
      </button>
    </div>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if days.length === 0}
    <div class="empty-state">
      <p>No roast days yet. Start planning your first roast!</p>
    </div>
  {:else}
    <div class="days-list">
      {#each days as day}
        <div class="day-card">
          <a href="/planner?date={day.production_date}" class="day-card-link">
            <div class="day-header">
              <h3>{formatDate(day.production_date)}</h3>
              <span class="status-badge {getStatusBadge(day.status).class}">
                {getStatusBadge(day.status).emoji} {getStatusBadge(day.status).label}
              </span>
            </div>
            <div class="day-meta">
              Created {formatTimestamp(day.created_at)}
              {#if day.completed_at}
                • Completed {formatTimestamp(day.completed_at)}
              {/if}
            </div>
          </a>
          <button
            class="delete-button"
            onclick={(e) => { e.preventDefault(); deleteDay(day.production_date); }}
            disabled={loading}
          >
            ✕
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showNewDayModal}
  <div class="modal-overlay" onclick={() => showNewDayModal = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      {#if activeDay}
        <h2>Active Roast Day Found</h2>
        <p>You have an unfinished roast day for <strong>{formatDate(activeDay.production_date)}</strong>.</p>
        <p>What would you like to do?</p>

        <div class="date-picker-section">
          <label for="new-day-date">Date for new roast day:</label>
          <input
            id="new-day-date"
            type="date"
            bind:value={newDayDate}
            min="2020-01-01"
          />
        </div>

        <div class="modal-actions">
          <button onclick={finishActiveAndStartNew} disabled={loading}>
            Finish {formatDate(activeDay.production_date)} and start new
          </button>
          <button onclick={() => goto(`/planner?date=${activeDay.production_date}`)} disabled={loading}>
            Continue working on {formatDate(activeDay.production_date)}
          </button>
          <button onclick={() => { showNewDayModal = false; createNewDay('scheduled'); }} disabled={loading}>
            Plan ahead (keep current active)
          </button>
          <button class="cancel" onclick={() => showNewDayModal = false} disabled={loading}>
            Cancel
          </button>
        </div>
      {:else}
        <h2>Create Roast Day</h2>
        <p>Pick a date for your roast day:</p>

        <div class="date-picker-section">
          <label for="new-day-date">Date:</label>
          <input
            id="new-day-date"
            type="date"
            bind:value={newDayDate}
            min="2020-01-01"
          />
        </div>

        <div class="modal-actions">
          <button onclick={() => createNewDay('active')} disabled={loading}>
            Create as Active
          </button>
          <button onclick={() => createNewDay('scheduled')} disabled={loading}>
            Create as Scheduled
          </button>
          <button class="cancel" onclick={() => showNewDayModal = false} disabled={loading}>
            Cancel
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if showCatalog}
  <Catalog
    onClose={() => (showCatalog = false)}
    onUpdate={() => {}}
  />
{/if}

{#if showSettings}
  <Settings
    {units}
    onClose={() => (showSettings = false)}
    onUnitsChange={(newUnits) => (units = newUnits)}
  />
{/if}

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    color: #231f20;
    font-size: 2rem;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .action-button {
    padding: 5px 14px;
    background: #231f20;
    border: 1px solid #231f20;
    border-radius: 5px;
    color: #f6f4eb;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
    white-space: nowrap;
  }

  .action-button:hover {
    background: #3a3536;
    border-color: #3a3536;
  }

  .primary-button {
    padding: 1rem 2rem;
    background: #6b7360;
    color: #f6f4eb;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    font-family: var(--font-family);
  }

  .primary-button:hover:not(:disabled) {
    background: #5a6250;
  }

  .primary-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: #f7e6e4;
    color: #b75742;
    padding: 1rem;
    border: 1px solid #d8afa7;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #6b7360;
  }

  .days-list {
    display: grid;
    gap: 1rem;
  }

  .day-card {
    position: relative;
    background: #f6f4eb;
    border: 2px solid #c8c4a8;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .day-card:hover {
    border-color: #6b7360;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .day-card-link {
    display: block;
    padding: 1.5rem;
    text-decoration: none;
    color: inherit;
  }

  .delete-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 28px;
    height: 28px;
    padding: 0;
    background: #f6f4eb;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    color: #b75742;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s, background 0.2s;
  }

  .day-card:hover .delete-button {
    opacity: 1;
  }

  .delete-button:hover:not(:disabled) {
    background: #b75742;
    color: #f6f4eb;
    border-color: #b75742;
  }

  .delete-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .day-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #231f20;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .status-active {
    background: #d4edda;
    color: #155724;
  }

  .status-scheduled {
    background: #d1ecf1;
    color: #0c5460;
  }

  .status-completed {
    background: #e2e3e5;
    color: #383d41;
  }

  .day-meta {
    font-size: 0.875rem;
    color: #6b7360;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #f6f4eb;
    border: 2px solid #c8c4a8;
    border-radius: 8px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
  }

  .modal h2 {
    margin: 0 0 1rem 0;
    color: #231f20;
  }

  .modal p {
    margin: 0 0 1rem 0;
    color: #231f20;
  }

  .date-picker-section {
    margin: 1.5rem 0;
    padding: 1rem;
    background: #eae8d8;
    border-radius: 4px;
  }

  .date-picker-section label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #231f20;
    margin-bottom: 0.5rem;
  }

  .date-picker-section input[type="date"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    font-family: var(--font-family);
    font-size: 1rem;
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .modal-actions button {
    padding: 0.75rem 1rem;
    background: #6b7360;
    color: #f6f4eb;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-family);
    font-size: 0.9rem;
  }

  .modal-actions button:hover:not(:disabled) {
    background: #5a6250;
  }

  .modal-actions button.cancel {
    background: transparent;
    color: #6b7360;
    border: 1px solid #c8c4a8;
  }

  .modal-actions button.cancel:hover:not(:disabled) {
    background: #eae8d8;
  }

  .modal-actions button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
