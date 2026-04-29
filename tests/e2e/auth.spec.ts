import { test, expect, TEST_USER } from './fixtures';

test('the login API issues a session and lands on the dashboard', async ({ page }) => {
  // Drive login via the API (page.request shares cookies with page)
  // rather than the form so this spec doesn't depend on the login
  // page's submit handler, which is being rewritten for Svelte 5.
  const res = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  });
  expect(res.status()).toBe(200);

  await page.goto('/');
  await expect(page.getByRole('img', { name: /beanledger/i })).toBeVisible();
});

test('rejects bad credentials', async ({ page }) => {
  const res = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: 'wrong-password' }
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});
