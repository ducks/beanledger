<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let invite = $state<{ email: string; role: string; tenant: string } | null>(null);
  let lookupError = $state('');
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  const token = $derived($page.url.searchParams.get('token') ?? '');

  onMount(async () => {
    const res = await fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`);
    if (res.ok) {
      invite = await res.json();
    } else {
      lookupError = (await res.json().catch(() => ({}))).error || 'Invitation not found';
    }
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password })
      });
      if (!res.ok) {
        error = (await res.json().catch(() => ({}))).error || 'Could not accept invitation';
        return;
      }
      goto('/');
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1>BeanLedger</h1>
    {#if lookupError}
      <p class="error">{lookupError}</p>
      <p><a href="/login">Log in</a></p>
    {:else if invite}
      <p>You are joining <strong>{invite.tenant}</strong> as {invite.role}, as {invite.email}.</p>
      <form onsubmit={submit}>
        {#if error}<div class="error">{error}</div>{/if}
        <div class="form-group">
          <label for="username">Username</label>
          <input id="username" type="text" bind:value={username} required disabled={loading} />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" type="password" bind:value={password} minlength="8" required disabled={loading} />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Joining…' : 'Create account'}</button>
      </form>
    {:else}
      <p>Checking invitation…</p>
    {/if}
  </div>
</div>

<style>
  .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--border-subtle); }
  .auth-card { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 8px; padding: 2rem; width: 100%; max-width: 420px; }
  .form-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
  input { padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); }
  button { padding: 0.6rem 1rem; background: var(--accent); color: var(--text-inverse); border: none; border-radius: 4px; cursor: pointer; }
  .error { color: var(--danger); margin-bottom: 1rem; }
</style>
