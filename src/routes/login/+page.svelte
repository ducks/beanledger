<script lang="ts">
  import { goto } from '$app/navigation';

  let username = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleLogin() {
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Login failed';
        return;
      }

      goto('/');
    } catch (err) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-container">
  <div class="login-card">
    <h1>BeanLedger</h1>
    <p class="subtitle">Coffee Roaster Production Planner</p>

    <form on:submit|preventDefault={handleLogin}>
      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>

    <p class="signup-link">
      Don't have an account? <a href="/signup">Sign up</a>
    </p>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: var(--border-subtle);
  }

  .login-card {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(35, 31, 32, 0.1);
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: var(--accent);
    font-weight: 700;
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 600;
    color: var(--text);
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 1rem;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-family);
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
  }

  input:disabled {
    background: var(--bg-sunken);
    cursor: not-allowed;
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background: var(--text);
    color: var(--bg);
    border: 1px solid var(--text);
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.5rem;
    font-family: var(--font-family);
  }

  button:hover:not(:disabled) {
    background: var(--button-dark-hover);
    border-color: var(--button-dark-hover);
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: var(--danger-bg);
    color: var(--danger);
    padding: 0.75rem;
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .signup-link {
    text-align: center;
    margin-top: 1.5rem;
    color: var(--text-muted);
  }

  .signup-link a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }

  .signup-link a:hover {
    text-decoration: underline;
  }
</style>
