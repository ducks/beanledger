<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { RoastGroup } from '$lib/types';

  let groups = $state<RoastGroup[]>([]);
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  let form = $state({
    name: '',
    lbs: '',
    group_id: ''
  });

  onMount(async () => {
    const res = await fetch('/api/groups');
    groups = await res.json();
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';
    success = false;

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `p${Date.now()}`,
          name: form.name,
          lbs: parseFloat(form.lbs),
          group_id: form.group_id,
          active: true,
          created_at: new Date().toISOString().slice(0, 10)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'Failed to create product';
        return;
      }

      success = true;

      // Reset form
      form = { name: '', lbs: '', group_id: '' };

      // Redirect after short delay
      setTimeout(() => goto('/'), 1500);
    } catch (err) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }
</script>

<div class="page">
  <div class="header">
    <h1>Add New Product</h1>
    <a href="/" class="back-link">← Back to Planner</a>
  </div>

  {#if success}
    <div class="success-message">
      Product created successfully! Redirecting...
    </div>
  {/if}

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <form onsubmit={handleSubmit}>
    <div class="form-group">
      <label for="name">Product Name</label>
      <input
        type="text"
        id="name"
        bind:value={form.name}
        required
        placeholder="e.g., Decaf Huila - 5lb"
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label for="lbs">Weight (lbs)</label>
      <input
        type="number"
        id="lbs"
        bind:value={form.lbs}
        step="0.01"
        min="0.01"
        required
        placeholder="e.g., 5.0"
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label for="group">Roast Group</label>
      <select
        id="group"
        bind:value={form.group_id}
        required
        disabled={loading}
      >
        <option value="">Select a roast group...</option>
        {#each groups as group}
          <option value={group.id}>
            {group.tag} - {group.label}
          </option>
        {/each}
      </select>
    </div>

    <div class="form-actions">
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Product'}
      </button>
      <a href="/" class="cancel-button">Cancel</a>
    </div>
  </form>
</div>

<style>
  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #b29244;
    margin: 0;
  }

  .back-link {
    color: #6b7360;
    text-decoration: none;
    font-size: 14px;
  }

  .back-link:hover {
    color: #b29244;
  }

  .success-message {
    background: #efe;
    color: #363;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 20px;
    border: 1px solid #9d9;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 20px;
    border: 1px solid #faa;
  }

  form {
    background: #eae8d8;
    border: 1px solid #c8c4a8;
    border-radius: 8px;
    padding: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #231f20;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  input,
  select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    background: #f6f4eb;
    color: #231f20;
    font-family: var(--font-family);
    font-size: 14px;
    box-sizing: border-box;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #b29244;
  }

  input:disabled,
  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  button {
    flex: 1;
    padding: 12px 20px;
    background: #b29244;
    color: #f6f4eb;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  button:hover:not(:disabled) {
    background: #9d7d37;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-button {
    flex: 1;
    padding: 12px 20px;
    background: #ddd9c4;
    color: #231f20;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    display: block;
    box-sizing: border-box;
  }

  .cancel-button:hover {
    background: #ccc8b3;
  }
</style>
