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
        <button onclick={handleLogout}>Log out</button>
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
    background: #eae8d8;
    border-bottom: 1px solid #c8c4a8;
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
    color: #b29244;
    font-weight: 700;
  }

  .tenant-name {
    color: #6b7360;
    font-size: 0.9rem;
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .username {
    color: #6b7360;
    font-size: 0.9rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #231f20;
    color: #f6f4eb;
    border: 1px solid #231f20;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  button:hover {
    background: #3a3536;
    border-color: #3a3536;
  }
</style>
