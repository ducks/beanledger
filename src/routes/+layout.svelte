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
</style>
