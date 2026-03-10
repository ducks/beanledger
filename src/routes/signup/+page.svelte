<script lang="ts">
  import { goto } from '$app/navigation';

  let username = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let tenantName = '';
  let error = '';
  let loading = false;

  async function handleSignup() {
    error = '';

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, tenantName })
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Signup failed';
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

<div class="signup-container">
  <div class="signup-card">
    <h1>Create Account</h1>
    <p class="subtitle">Start planning your coffee roasting</p>

    <form on:submit|preventDefault={handleSignup}>
      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="form-group">
        <label for="tenantName">Roastery Name</label>
        <input
          id="tenantName"
          type="text"
          bind:value={tenantName}
          placeholder="My Coffee Roasters"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder="username"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
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
          placeholder="At least 8 characters"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          bind:value={confirmPassword}
          placeholder="Re-enter password"
          required
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign up'}
      </button>
    </form>

    <p class="login-link">
      Already have an account? <a href="/login">Log in</a>
    </p>
  </div>
</div>

<style>
  .signup-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #d8d4bc;
    padding: 2rem 1rem;
  }

  .signup-card {
    background: #eae8d8;
    border: 1px solid #c8c4a8;
    border-radius: 8px;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(35, 31, 32, 0.1);
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: #b29244;
    font-weight: 700;
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: #6b7360;
    font-size: 0.9rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 600;
    color: #231f20;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    font-size: 1rem;
    background: #f6f4eb;
    color: #231f20;
    font-family: var(--font-family);
  }

  input:focus {
    outline: none;
    border-color: #b29244;
  }

  input:disabled {
    background: #ddd9c4;
    cursor: not-allowed;
  }

  input::placeholder {
    color: #6b7360;
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background: #231f20;
    color: #f6f4eb;
    border: 1px solid #231f20;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.5rem;
    font-family: var(--font-family);
  }

  button:hover:not(:disabled) {
    background: #3a3536;
    border-color: #3a3536;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: #f7e6e4;
    color: #b75742;
    padding: 0.75rem;
    border: 1px solid #d8afa7;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .login-link {
    text-align: center;
    margin-top: 1.5rem;
    color: #6b7360;
  }

  .login-link a {
    color: #b29244;
    text-decoration: none;
    font-weight: 600;
  }

  .login-link a:hover {
    text-decoration: underline;
  }
</style>
