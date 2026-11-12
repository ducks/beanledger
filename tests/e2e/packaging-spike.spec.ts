import { test, expect } from '@playwright/test';

test('explicit packaging preview counts bags by assignment without changing coffee weights', async ({ page }) => {
  await page.goto('/design-system/packaging');
  await page.waitForLoadState('networkidle');
  for (const name of ['House blend', 'Single origin']) {
    await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save product', exact: true })).toBeDisabled();
    await page.getByLabel('Packaging', { exact: true }).selectOption('trade');
    await page.getByRole('button', { name: 'Save product', exact: true }).click();
  }
  await expect(page.getByRole('row').filter({ hasText: 'House blend' })).toContainText('308 g');
  await expect(page.getByRole('row').filter({ hasText: 'Single origin' })).toContainText('310 g');
  await page.getByRole('button', { name: 'Packing preview', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: '10.9oz TRADE' });
  await expect(row.getByRole('cell')).toHaveText(['200', '54', '146']);
  await page.getByRole('button', { name: 'Import review', exact: true }).click();
  await page.getByRole('button', { name: 'Create product & review packaging' }).click();
  await page.getByLabel('Unit', { exact: true }).selectOption('g');
  expect(Number(await page.getByLabel('Coffee weight', { exact: true }).inputValue())).toBeCloseTo(309.0098, 3);
  await page.getByLabel('Packaging', { exact: true }).selectOption('bulk');
  await page.getByRole('button', { name: 'Create product & import 8 bags' }).click();
  await page.getByRole('button', { name: 'Packing preview', exact: true }).click();
  await expect(row.getByRole('cell')).toHaveText(['200', '54', '146']);
  await expect(page.getByText('Untracked / bulk: 8 units. No bag stock deducted.')).toBeVisible();
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('[data-preview-theme]')).toHaveAttribute('data-preview-theme', 'dark');
});
