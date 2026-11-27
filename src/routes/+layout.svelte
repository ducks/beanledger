<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { LayoutData } from './$types';
  import { units } from '$lib/stores/units';

  let { data, children }: { data: LayoutData; children: any } = $props();

  let theme = $state<'light' | 'dark'>('light');

  // Hydrate the units store from the server-loaded user preference.
  // Re-runs if data.user changes (login, logout).
  $effect(() => {
    if (data.user?.preferred_units) {
      units.set(data.user.preferred_units);
    }
  });

  onMount(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      theme = stored;
    } else {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);

    // Prevent scroll-wheel from changing number input values while focused.
    // Without this, scrolling the page over a focused number field silently
    // increments/decrements it, which is a common cause of wrong quantities.
    const onWheel = (e: WheelEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'number') {
        (el as HTMLInputElement).blur();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  let resent = $state(false);
  let resendError = $state('');
  async function resendVerification() {
    resendError = '';
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        resendError = data.error || 'Could not send verification email. Please try again.';
        return;
      }
      resent = true;
    } catch {
      resendError = 'Could not send verification email. Please try again.';
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

{#if data.user}
  <header>
    <div class="container">
      <div class="brand">
        {#if data.tenant}
          <span class="tenant-name">{data.tenant.name}</span>
        {/if}
      </div>
      <div class="user-menu">
        <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme" aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <span class="theme-dot" aria-hidden="true"></span>
        </button>
        <span class="username">{data.user.username}</span>
        <button onclick={handleLogout}>Log out</button>
      </div>
    </div>
  </header>
{/if}

{#if data.user && !data.user.email_verified_at}
  <div class="verify-banner">
    <span>Please verify your email address ({data.user.email}).</span>
    {#if resent}
      <span>Sent. Check your inbox.</span>
    {:else}
      <button onclick={resendVerification}>Resend link</button>
    {/if}
    {#if resendError}<span role="alert">{resendError}</span>{/if}
  </div>
{/if}

{@render children()}

<style>
  @font-face { font-family: 'JetBrains Mono'; src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2'); font-style: normal; font-weight: 400; font-display: swap; }
  @font-face { font-family: 'JetBrains Mono'; src: url('/fonts/JetBrainsMono-Bold.woff2') format('woff2'); font-style: normal; font-weight: 600 800; font-display: swap; }

  .verify-banner {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    background: var(--info-bg);
    color: var(--info-text);
    font-size: 0.9rem;
  }
  .verify-banner button {
    background: none;
    border: 1px solid currentColor;
    color: inherit;
    border-radius: 4px;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
  }

  :global(:root) {
    --page-gutter: 32px;
    --font-family: 'JetBrains Mono', 'DejaVu Sans Mono', monospace;

    /* Surfaces */
    --bg: #ECEBE6;
    --bg-raised: #FFFFFF;
    --bg-sunken: #E2E0D8;
    --bg-accent: #E2E0D8;

    /* Borders */
    --border: #CFCDC5;
    --border-subtle: #CFCDC5;

    /* Text */
    --text: #141414;
    --text-muted: #55534D;
    --text-inverse: #ECEBE6;

    /* Ledger links and emphasis */
    --accent: #2F5E8C;
    --accent-hover: #254B70;

    /* Dark button */
    --button-dark: #141414;
    --button-dark-hover: #3a3536;

    /* Danger */
    --danger: #A8321E;
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
    --muted-green: #55534D;
    --muted-green-hover: #5a6250;

    color-scheme: light;
  }

  :global(:root[data-theme="dark"]) {
    --bg: #141414;
    --bg-raised: #1E1E1C;
    --bg-sunken: #0B0B0B;
    --bg-accent: #292927;

    --border: #3A3935;
    --border-subtle: #3A3935;

    --text: #ECEBE6;
    --text-muted: #BDBBB4;
    --text-inverse: #141414;

    --accent: #7FA6CC;
    --accent-hover: #A3C5E5;

    --button-dark: #ECEBE6;
    --button-dark-hover: #fffaeb;

    --danger: #F0634B;
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
      --bg: #141414;
      --bg-raised: #1E1E1C;
      --bg-sunken: #0B0B0B;
      --bg-accent: #292927;

      --border: #3A3935;
      --border-subtle: #3A3935;

      --text: #ECEBE6;
      --text-muted: #BDBBB4;
      --text-inverse: #141414;

      --accent: #7FA6CC;
      --accent-hover: #A3C5E5;

      --button-dark: #ECEBE6;
      --button-dark-hover: #fffaeb;

      --danger: #F0634B;
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
    padding: 0 var(--page-gutter);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
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

  .theme-toggle {
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  .theme-toggle:hover {
    background: transparent;
  }

  .theme-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.5px solid #ECEBE6;
    background: #ECEBE6;
  }

  :global([data-theme="dark"]) .theme-dot {
    background: #0B0B0B;
  }

  .theme-toggle:hover .theme-dot {
    box-shadow: 0 0 0 4px rgb(236 235 230 / 12%);
  }

  header {
    background: #0B0B0B;
    color: #ECEBE6;
    padding: 0.65rem 0;
    font-family: var(--font-family);
    line-height: 1.5;
  }
  .tenant-name, .username { color: #ECEBE6; font-size: 15px; }
  .tenant-name { font-weight: 700; }
  .theme-toggle, .theme-toggle:hover { color: #ECEBE6; background: transparent; }
  header button { background: transparent; color: #ECEBE6; border-color: #55534D; border-radius: 0; font-family: inherit; font-size: 14px; font-weight: 500; }
  :global(button), :global(input), :global(select), :global(textarea) { font-family: inherit; }
  :global(:focus-visible) { outline: 2px solid var(--accent); outline-offset: 3px; }
  @media (max-width: 600px) { :global(:root) { --page-gutter: 16px; } }
  @media (max-width: 480px) { .user-menu { gap: 0.5rem; } .username { display: none; } .brand { gap: 0.5rem; } }
</style>
