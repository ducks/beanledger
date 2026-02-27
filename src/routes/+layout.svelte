<script lang="ts">
  import { goto } from '$app/navigation';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

{#if data.user}
  <header>
    <div class="container">
      <div class="brand">
        <h1>BeanLedger</h1>
        {#if data.tenant}
          <span class="tenant-name">{data.tenant.name}</span>
        {/if}
      </div>
      <div class="user-menu">
        <span class="username">{data.user.username}</span>
        <button on:click={handleLogout}>Log out</button>
      </div>
    </div>
  </header>
{/if}

<slot />

<style>
  :global(:root) {
    --font-family: Arial, Helvetica, sans-serif;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: var(--font-family);
    background: #f6f4eb;
    color: #231f20;
  }

  :global(*) {
    box-sizing: border-box;
  }

  header {
    background: white;
    border-bottom: 1px solid #ddd;
    padding: 1rem 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .tenant-name {
    color: #666;
    font-size: 0.9rem;
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .username {
    color: #666;
    font-size: 0.9rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
  }

  button:hover {
    background: #5568d3;
  }
</style>
