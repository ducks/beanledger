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

    /* Surfaces */
    --bg: #f6f4eb;
    --bg-raised: #eae8d8;
    --bg-sunken: #ddd9c4;
    --bg-accent: #f0e8d4;

    /* Borders */
    --border: #c8c4a8;
    --border-subtle: #d8d4bc;

    /* Text */
    --text: #231f20;
    --text-muted: #6b7360;
    --text-inverse: #f6f4eb;

    /* Brand (gold) */
    --accent: #b29244;
    --accent-hover: #9d7d37;

    /* Dark button */
    --button-dark: #231f20;
    --button-dark-hover: #3a3536;

    /* Danger */
    --danger: #b75742;
    --danger-hover: #9d4836;
    --danger-bg: #f7e6e4;
    --danger-border: #d8afa7;

    /* Status: success */
    --success-bg: #d4edda;
    --success-text: #155724;

    /* Status: info */
    --info-bg: #d1ecf1;
    --info-text: #0c5460;

    /* Status: neutral */
    --neutral-bg: #e2e3e5;
    --neutral-text: #383d41;

    /* Muted green (neutral-positive) */
    --muted-green: #6b7360;
    --muted-green-hover: #5a6250;

    color-scheme: light;
  }

  :global(:root[data-theme="dark"]) {
    --bg: #1e1c1a;
    --bg-raised: #2a2723;
    --bg-sunken: #16140f;
    --bg-accent: #34302a;

    --border: #3f3b31;
    --border-subtle: #2f2c25;

    --text: #ede5d0;
    --text-muted: #9a9182;
    --text-inverse: #1e1c1a;

    --accent: #d4a84b;
    --accent-hover: #e5bc5f;

    --button-dark: #ede5d0;
    --button-dark-hover: #fffaeb;

    --danger: #d67d6a;
    --danger-hover: #e89584;
    --danger-bg: #3a201c;
    --danger-border: #5c3530;

    --success-bg: #1e3a25;
    --success-text: #8bc896;

    --info-bg: #1a3540;
    --info-text: #7fc3d8;

    --neutral-bg: #2c2e30;
    --neutral-text: #a8adb3;

    --muted-green: #8a9180;
    --muted-green-hover: #9ca395;

    color-scheme: dark;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) {
      --bg: #1e1c1a;
      --bg-raised: #2a2723;
      --bg-sunken: #16140f;
      --bg-accent: #34302a;

      --border: #3f3b31;
      --border-subtle: #2f2c25;

      --text: #ede5d0;
      --text-muted: #9a9182;
      --text-inverse: #1e1c1a;

      --accent: #d4a84b;
      --accent-hover: #e5bc5f;

      --button-dark: #ede5d0;
      --button-dark-hover: #fffaeb;

      --danger: #d67d6a;
      --danger-hover: #e89584;
      --danger-bg: #3a201c;
      --danger-border: #5c3530;

      --success-bg: #1e3a25;
      --success-text: #8bc896;

      --info-bg: #1a3540;
      --info-text: #7fc3d8;

      --neutral-bg: #2c2e30;
      --neutral-text: #a8adb3;

      --muted-green: #8a9180;
      --muted-green-hover: #9ca395;

      color-scheme: dark;
    }
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: var(--font-family);
    background: var(--bg);
    color: var(--text);
  }

  :global(*) {
    box-sizing: border-box;
  }

  header {
    background: var(--bg-raised);
    border-bottom: 1px solid var(--border);
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
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .username {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: var(--button-dark);
    color: var(--text-inverse);
    border: 1px solid var(--button-dark);
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  button:hover {
    background: var(--button-dark-hover);
    border-color: var(--button-dark-hover);
  }
</style>
