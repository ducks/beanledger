<script lang="ts">
  import { page } from '$app/stores';

  let password = $state('');
  let confirm = $state('');
  let done = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    if (password !== confirm) {
      error = 'Passwords do not match';
      return;
    }
    loading = true;
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: $page.url.searchParams.get('token') ?? '', password })
      });
      if (!res.ok) {
        error = (await res.json().catch(() => ({}))).error || 'Reset failed';
        return;
      }
      done = true;
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1>Choose a new password</h1>
    {#if done}
      <p>Your password is updated and every other session has been signed out.</p>
      <p><a href="/login">Log in</a></p>
    {:else}
      <form onsubmit={submit}>
        {#if error}<div class="error">{error}</div>{/if}
        <div class="form-group">
          <label for="password">New password</label>
          <input id="password" type="password" bind:value={password} minlength="8" required disabled={loading} />
        </div>
        <div class="form-group">
          <label for="confirm">Confirm password</label>
          <input id="confirm" type="password" bind:value={confirm} minlength="8" required disabled={loading} />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Set password'}</button>
      </form>
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
