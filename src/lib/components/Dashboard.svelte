<script lang="ts">
  import './workspace-actions.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Catalog from './Catalog.svelte';
  import Settings from './Settings.svelte';
  import Packaging from './Packaging.svelte';

  interface ProductionDay {
    production_date: string;
    status: 'active' | 'scheduled' | 'completed';
    created_at: string;
    completed_at: string | null;
  }

  let days = $state<ProductionDay[]>([]);
  let daysLoading = $state(true);
  let daysError = $state('');
  let loading = $state(false);
  let error = $state('');
  let showNewDayModal = $state(false);
  let newDayDate = $state(new Date().toISOString().slice(0, 10));
  let activeDay: ProductionDay | null = $state(null);
  let showCatalog = $state(false);
  let showSettings = $state(false);
  let showPackaging = $state(false);

  onMount(async () => {
    await loadDays();
  });

  async function loadDays() {
    daysLoading = true;
    daysError = '';
    try {
      const res = await fetch('/api/production-days');
      if (!res.ok) throw new Error(`Production days request failed (${res.status})`);
      const data = await res.json();
      if (!Array.isArray(data.days)) throw new Error('Invalid production days response');
      days = data.days;
      activeDay = days.find(d => d.status === 'active') || null;
    } catch (err) {
      console.error('Failed to load production days:', err);
      daysError = 'Could not load roast days. Please try again.';
    } finally {
      daysLoading = false;
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

  function continueActiveDay() {
    if (activeDay) {
      goto(`/planner?date=${activeDay.production_date}`);
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
    <a href="/" class="title">
      <h1><img class="wordmark light-wordmark" src="/images/ledger/wordmark-primary.svg" alt="BeanLedger" /><img class="wordmark dark-wordmark" src="/images/ledger/wordmark-on-dark.svg" alt="BeanLedger" /></h1>
      <p>Coffee roaster production planner</p>
    </a>
    <div class="header-actions">
      <div class="workspace-actions" role="group" aria-label="Workspace tools">
      <button class="action-button" class:open={showCatalog} aria-haspopup="dialog" onclick={() => showCatalog = true}>
        Catalog
      </button>
      <button class="action-button" class:open={showSettings} aria-haspopup="dialog" onclick={() => showSettings = true}>
        Settings
      </button>
      <button class="action-button" class:open={showPackaging} aria-haspopup="dialog" onclick={() => showPackaging = true}>
        Packaging
      </button>
      </div>
      <button class="primary-button" onclick={startNewDay} disabled={loading || daysLoading || !!daysError}>
        + Start New Roast Day
      </button>
    </div>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if daysLoading}
    <p>Loading roast days…</p>
  {:else if daysError}
    <div class="error" role="alert">
      <p>{daysError}</p>
      <button onclick={loadDays}>Try again</button>
    </div>
  {:else if days.length === 0}
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
                {getStatusBadge(day.status).label}
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
            aria-label="Delete roast day {formatDate(day.production_date)}"
            title="Delete roast day"
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
          <button onclick={continueActiveDay} disabled={loading}>
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
  <Settings onClose={() => (showSettings = false)} />
{/if}

{#if showPackaging}
  <Packaging onClose={() => (showPackaging = false)} />
{/if}

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem var(--page-gutter);
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 1rem 0 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  h1 {
    color: var(--text);
    font-size: 2rem;
    margin: 0;
  }

  .title { min-width: 0; text-decoration: none; }
  .title p { margin: 10px 0 0; color: var(--text-muted); font-size: 11px; }
  .wordmark { display: block; width: 270px; max-width: 100%; height: auto; }
  .dark-wordmark { display: none; }
  :global([data-theme="dark"]) .light-wordmark { display: none; }
  :global([data-theme="dark"]) .dark-wordmark { display: block; }

  .header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }



  .primary-button {
    padding: 10px 14px;
    background: var(--muted-green);
    color: var(--bg);
    border: none;
    border-radius: 0;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-family);
  }

  @media (min-width: 1000px) {
    header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: 24px; padding-bottom: 0; }
    .header-actions { display: contents; }
    header :global(.workspace-actions) { justify-content: center; margin-bottom: -1px; }
    .title { padding-bottom: 14px; }
    .primary-button { margin-bottom: 14px; }
  }

  @media (max-width: 600px) {
    .dashboard { padding: 16px; }
    .header-actions { gap: 12px; }
    .primary-button { min-height: 44px; }
  }

  .primary-button:hover:not(:disabled) {
    background: var(--muted-green-hover);
  }

  .primary-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: var(--danger-bg);
    color: var(--danger);
    padding: 1rem;
    border: 1px solid var(--danger-border);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-muted);
  }

  .days-list {
    display: grid;
    border-top: 3px solid var(--text);
    border-bottom: 4px double var(--text);
  }

  .day-card {
    position: relative;
    background: var(--bg-raised);
    border-bottom: 1px solid var(--border);
  }

  .day-card:hover, .day-card:focus-within {
    background: var(--bg);
  }

  .day-card-link {
    display: block;
    padding: 20px 72px 20px 20px;
    text-decoration: none;
    color: inherit;
  }

  .delete-button {
    position: absolute;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    padding: 0;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 0;
    color: var(--danger);
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-button:hover:not(:disabled) {
    background: var(--danger);
    color: var(--bg);
    border-color: var(--danger);
  }

  .delete-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .day-header {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .day-header h3 {
    margin: 0;
    font-size: 15px;
    color: var(--text);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge::before { content: ''; width: 6px; height: 6px; background: currentColor; border-radius: 50%; }

  .status-active {
    color: var(--success-text);
  }

  .status-scheduled {
    color: var(--accent);
  }

  .status-completed {
    color: var(--text-muted);
  }

  .day-meta {
    font-size: 11px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  @media (max-width: 600px) {
    .day-card-link { padding: 16px 68px 16px 16px; }
    .delete-button { right: 12px; width: 44px; height: 44px; }
    .day-header { gap: 8px; }
    .day-header h3 { font-size: 14px; }
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
    background: var(--bg);
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
  }

  .modal h2 {
    margin: 0 0 1rem 0;
    color: var(--text);
  }

  .modal p {
    margin: 0 0 1rem 0;
    color: var(--text);
  }

  .date-picker-section {
    margin: 1.5rem 0;
    padding: 1rem;
    background: var(--bg-raised);
    border-radius: 4px;
  }

  .date-picker-section label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  .date-picker-section input[type="date"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border);
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
    background: var(--muted-green);
    color: var(--bg);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-family);
    font-size: 0.9rem;
  }

  .modal-actions button:hover:not(:disabled) {
    background: var(--muted-green-hover);
  }

  .modal-actions button.cancel {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .modal-actions button.cancel:hover:not(:disabled) {
    background: var(--bg-raised);
  }

  .modal-actions button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
