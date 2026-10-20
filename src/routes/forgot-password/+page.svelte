<script lang="ts">
  let email = $state('');
  let sent = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        error = (await res.json().catch(() => ({}))).error || 'Request failed';
        return;
      }
      sent = true;
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1>Reset your password</h1>
    {#if sent}
      <p>If that address has an account, a reset link is on its way. It is valid for one hour.</p>
      <p><a href="/login">Back to log in</a></p>
    {:else}
      <form onsubmit={submit}>
        {#if error}<div class="error">{error}</div>{/if}
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" type="email" bind:value={email} required disabled={loading} />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p class="link"><a href="/login">Back to log in</a></p>
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
  .link { margin-top: 1rem; }
</style>
