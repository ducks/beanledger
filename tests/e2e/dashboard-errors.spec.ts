import { test, expect, TEST_USER } from './fixtures';

test('a failed roast-day request is not shown as an empty account and can be retried', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  });
  expect(login.status()).toBe(200);

  let requests = 0;
  await page.route('**/api/production-days', async (route) => {
    if (route.request().method() === 'GET' && ++requests === 1) {
      await route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
    } else {
      await route.continue();
    }
  });

  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Could not load roast days. Please try again.');
  await expect(page.getByText('No roast days yet.')).toBeHidden();
  await expect(page.getByRole('button', { name: /Start New Roast Day/ })).toBeDisabled();

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('No roast days yet. Start planning your first roast!')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start New Roast Day/ })).toBeEnabled();
});
