import { test as base, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { Client } from 'pg';

const TEST_DATABASE_URL =
  'postgresql://beanledger:beanledger@localhost:5433/beanledger_test';

export const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'testpass1234',
  tenantName: 'Test Roastery'
};

/**
 * Wipe all data and signup the test user.
 * Runs before every test to keep state predictable.
 */
async function resetTestData() {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();

  // Truncating tenants cascades through every tenant-scoped table thanks
  // to ON DELETE CASCADE, so we don't have to enumerate FKs ourselves.
  await client.query(`TRUNCATE tenants RESTART IDENTITY CASCADE`);

  await client.end();
}

/**
 * Create the test user via the signup API so we exercise the same
 * code path users do (hashing, session creation, etc.).
 */
async function signupTestUser(baseURL: string) {
  const res = await fetch(`${baseURL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  if (!res.ok) {
    throw new Error(`Failed to seed test user: ${res.status} ${await res.text()}`);
  }
}

/**
 * A logged-in API context for a brand-new tenant, separate from the
 * default test user. Used by isolation tests; dispose it when done.
 */
export async function signupTenant(
  baseURL: string,
  name: string
): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext({ baseURL });
  const res = await context.post('/api/auth/signup', {
    data: {
      username: `${name}-user`,
      email: `${name}@example.com`,
      password: 'anotherpass1234',
      tenantName: `${name} Roastery`
    }
  });
  if (!res.ok()) {
    throw new Error(`Failed to sign up ${name}: ${res.status()} ${await res.text()}`);
  }
  return context;
}

export const test = base.extend<{ seed: void }>({
  seed: [
    async ({ baseURL }, use) => {
      await resetTestData();
      await signupTestUser(baseURL!);
      await use();
    },
    { auto: true }
  ]
});

export { expect };
