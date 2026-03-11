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
        <a href="/">
          <img src="/images/bean-ledger-logo.png" alt="BeanLedger" class="logo" />
        </a>
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
    align-items: center;
    gap: 1rem;
  }

  .brand a {
    display: block;
    line-height: 0;
  }

  .logo {
    height: 50px;
    width: auto;
    transition: opacity 0.2s;
  }

  .brand a:hover .logo {
    opacity: 0.8;
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
