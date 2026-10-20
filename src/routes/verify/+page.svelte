<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let status = $state<'working' | 'ok' | 'error'>('working');
  let message = $state('');

  onMount(async () => {
    const token = $page.url.searchParams.get('token') ?? '';
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json().catch(() => ({}));
    status = res.ok ? 'ok' : 'error';
    message = res.ok ? 'Your email address is verified.' : data.error || 'Verification failed';
  });
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1>BeanLedger</h1>
    {#if status === 'working'}
      <p>Verifying…</p>
    {:else}
      <p class:error={status === 'error'}>{message}</p>
      <p><a href="/">Continue to BeanLedger</a></p>
    {/if}
  </div>
</div>

<style>
  .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--border-subtle); }
  .auth-card { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 8px; padding: 2rem; width: 100%; max-width: 420px; }
  .error { color: var(--danger); }
</style>
