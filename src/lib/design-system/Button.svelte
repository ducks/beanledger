<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  let { variant = 'secondary', children, ...props }: HTMLButtonAttributes & {
    variant?: 'primary' | 'secondary' | 'danger'; children: Snippet;
  } = $props();
</script>
<button type="button" class={variant} {...props}>{@render children()}</button>
<style>
  button { min-height: 44px; padding: .625rem 1rem; border: 1px solid var(--ds-line); border-radius: var(--ds-radius-control); background: var(--ds-surface); color: var(--ds-ink); font: inherit; font-weight: 600; cursor: pointer; }
  button.primary { background: var(--ds-brand); color: var(--ds-on-brand); border-color: var(--ds-brand); }
  button.danger { color: var(--ds-error); border-color: var(--ds-error); }
  button:hover:not(:disabled) { filter: brightness(.94); }
  button:disabled { opacity: .55; cursor: not-allowed; }
</style>
