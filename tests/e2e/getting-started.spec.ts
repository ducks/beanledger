import { test, expect, TEST_USER } from './fixtures';

async function login(page: import('@playwright/test').Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  });
  expect(response.status()).toBe(200);
}

test('a new roaster can walk through setup, dismiss the guide, and reopen it', async ({ page }) => {
  await login(page);
  await page.goto('/');

  const guide = page.getByRole('region', { name: 'Get started with BeanLedger' });
  await expect(guide).toBeVisible();
  await expect(guide.getByText('Step 1 of 5')).toBeVisible();
  await guide.getByRole('button', { name: 'Open Settings' }).click();
  await expect(page.getByText('Batch Types', { exact: true })).toBeVisible();
  await page.locator('.modal').filter({ hasText: 'Batch Types' }).locator('.close-button').first().click();

  await guide.getByRole('button', { name: 'Next' }).click();
  await expect(guide.getByText('Step 2 of 5')).toBeVisible();
  await guide.getByRole('button', { name: 'Open Catalog' }).click();
  await expect(page.getByText('Catalog Management')).toBeVisible();
  await page.locator('.modal').filter({ hasText: 'Catalog Management' }).locator('.close-button').first().click();

  await guide.getByRole('button', { name: 'Next' }).click();
  await expect(guide.getByText('Step 3 of 5')).toBeVisible();
  await guide.getByRole('button', { name: 'Open CSV Formats' }).click();
  await expect(page.getByText('CSV Import Formats')).toBeVisible();
  await page.getByRole('button', { name: '+ Add Format' }).click();
  const format = page.locator('.modal').filter({ hasText: 'Add CSV Format' });
  await format.getByLabel('Format Name').fill('Custom export');
  await format.locator('input[type=file]').setInputFiles({
    name: 'orders.csv', mimeType: 'text/csv', buffer: Buffer.from('Product,Quantity\nCoffee A,4\n')
  });
  await format.locator('#fmt-name-col').selectOption('product');
  await format.getByLabel('Quantity Column').selectOption('quantity');
  await expect(format.getByText('Coffee A')).toBeVisible();
  await format.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Custom export', { exact: true })).toBeVisible();
  await page.locator('.modal').filter({ hasText: 'Catalog Management' }).locator('.close-button').first().click();
  await guide.getByRole('button', { name: 'Next' }).click();
  await expect(guide.getByText('Step 4 of 5')).toBeVisible();
  await guide.getByRole('button', { name: 'Next' }).click();
  await expect(guide.getByText('Step 5 of 5')).toBeVisible();
  await expect(guide.getByText(/import orders from a CSV/i)).toBeVisible();
  await guide.getByRole('button', { name: 'Done' }).click();
  await expect(guide).toBeHidden();

  await page.reload();
  await expect(page.getByText('No roast days yet.')).toBeVisible();
  await expect(guide).toBeHidden();
  await page.getByRole('button', { name: 'Getting started' }).click();
  await expect(guide).toBeVisible();
  await expect(guide.getByText('Step 1 of 5')).toBeVisible();

  await page.getByRole('button', { name: /Start New Roast Day/ }).click();
  await expect(page).toHaveURL(/\/planner\?date=/);
  await expect(page.getByLabel('Format:').locator('option', { hasText: 'Custom export' })).toHaveCount(1);
});

test('existing roast days do not automatically open the guide', async ({ page }) => {
  await login(page);
  const response = await page.request.post('/api/production-days', {
    data: { production_date: '2026-10-20', status: 'active' }
  });
  expect(response.ok()).toBe(true);
  await page.goto('/');
  await expect(page.getByText('Active', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Get started with BeanLedger' })).toBeHidden();
  await page.getByRole('button', { name: 'Getting started' }).click();
  await expect(page.getByRole('region', { name: 'Get started with BeanLedger' })).toBeVisible();
});
