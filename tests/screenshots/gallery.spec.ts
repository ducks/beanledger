import { test, expect, TEST_USER, lastMailToken } from '../e2e/fixtures';
import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve('artifacts/screenshot-gallery');

// This suite uses the same throwaway database and synthetic user as the e2e
// tests. Never point it at a production database or publish test artifacts.
test('capture the product with synthetic data', async ({ page, browser, baseURL }) => {
  fs.mkdirSync(output, { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));

  async function capture(name: string, target = page) {
    for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
      await target.setViewportSize(viewport);
      await target.screenshot({ path: path.join(output, `${name}-${size}.png`), fullPage: true, animations: 'disabled' });
    }
    await target.setViewportSize({ width: 1440, height: 1000 });
  }

  await page.goto('/login'); await expect(page.getByRole('heading', { name: 'BeanLedger' })).toBeVisible(); await capture('01-login');
  await page.goto('/signup'); await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible(); await capture('02-signup');
  await page.goto('/forgot-password'); await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible(); await capture('03-forgot-password');
  await page.goto('/reset-password'); await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible(); await capture('04-reset-password');
  await page.goto('/verify'); await expect(page.getByRole('link', { name: 'Continue to BeanLedger' })).toBeVisible(); await capture('05-verification-invalid-link');
  await page.goto('/invite'); await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible(); await capture('06-invitation-invalid-link');
  const verifyToken = lastMailToken(TEST_USER.email, /verify/i);
  await page.goto(`/verify?token=${verifyToken}`);
  await expect(page.getByText('Your email address is verified.')).toBeVisible(); await capture('05b-verification-success');

  const api = page.request;
  expect((await api.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).ok()).toBeTruthy();
  expect((await api.post('/api/tenant/invites', { data: { email: 'roaster@example.com', role: 'staff' } })).ok()).toBeTruthy();
  const inviteToken = lastMailToken('roaster@example.com', /invited/i);
  const guest = await browser.newPage({ baseURL });
  await guest.goto(`/invite?token=${inviteToken}`);
  await expect(guest.getByRole('button', { name: 'Create account' })).toBeVisible();
  await capture('06b-invitation-valid', guest);
  await guest.close();
  await page.goto('/');
  const guide = page.getByRole('region', { name: 'Get started with BeanLedger' });
  await expect(guide).toBeVisible();
  for (let i = 1; i <= 5; i++) {
    await expect(guide.getByText(`Step ${i} of 5`)).toBeVisible();
    await capture(`07-walkthrough-step-${i}`);
    if (i < 5) await guide.getByRole('button', { name: 'Next' }).click();
  }
  await guide.getByRole('button', { name: 'Done' }).click();
  await capture('08-dashboard-empty');

  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByText('Batch Types', { exact: true })).toBeVisible(); await capture('09-settings');
  await page.locator('.modal').filter({ hasText: 'Batch Types' }).locator('.close-button').first().click();
  await page.getByRole('button', { name: /Catalog/ }).click();
  await expect(page.getByText('Catalog Management')).toBeVisible();
  await capture('10-catalog-products');
  await page.getByRole('button', { name: /Roast Groups \(/ }).click(); await capture('11-catalog-roast-groups');
  await page.getByRole('button', { name: /Aliases \(/ }).click(); await capture('12-catalog-aliases');
  await page.getByRole('button', { name: /CSV Formats \(/ }).click(); await capture('13-catalog-csv-formats');
  await page.getByRole('button', { name: '+ Add Format' }).click();
  const format = page.locator('.modal').filter({ hasText: 'Add CSV Format' });
  await format.getByLabel('Format Name').fill('Example order export');
  await format.locator('input[type=file]').setInputFiles({ name: 'example.csv', mimeType: 'text/csv', buffer: Buffer.from('Product,Quantity\nHouse Blend 12oz,4\n') });
  await format.locator('#fmt-name-col').selectOption('product');
  await format.getByLabel('Quantity Column').selectOption('quantity');
  await expect(format.getByText('House Blend 12oz')).toBeVisible(); await capture('14-custom-csv-format');
  await format.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Example order export', { exact: true })).toBeVisible();
  await page.locator('.modal').filter({ hasText: 'Catalog Management' }).locator('.close-button').first().click();
  await page.getByRole('button', { name: /Packaging/ }).click();
  await expect(page.getByText('Packaging Inventory', { exact: true })).toBeVisible(); await capture('15-packaging');
  await page.locator('.modal').filter({ hasText: 'Packaging Inventory' }).locator('.close-button').first().click();

  await page.goto('/products/new'); await expect(page.locator('form')).toBeVisible(); await capture('16-new-product');

  expect((await api.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } })).ok()).toBeTruthy();
  const groupRes = await api.post('/api/groups', { data: { label: 'House Blend', batch_type: 'standard', roast_loss_pct: 15, type: 'single_origin' } });
  expect(groupRes.ok()).toBeTruthy(); const group = await groupRes.json();
  const productRes = await api.post('/api/products', { data: { name: 'House Blend 12oz', lbs: 0.75, group_id: group.id } });
  expect(productRes.ok()).toBeTruthy(); const product = await productRes.json();
  const date = '2026-10-20';
  expect((await api.post('/api/production-days', { data: { production_date: date, status: 'active' } })).ok()).toBeTruthy();
  expect((await api.post('/api/orders', { data: { product_id: product.id, qty: 12, production_date: date } })).ok()).toBeTruthy();
  await page.goto('/'); await expect(page.getByText('Active', { exact: false }).first()).toBeVisible(); await capture('17-dashboard-with-roast-day');
  await page.goto(`/planner?date=${date}`); await expect(page.getByText('House Blend', { exact: true }).first()).toBeVisible(); await capture('18-roast-planner');
  await page.getByRole('button', { name: /Pick List/ }).click(); await expect(page.getByText('Package Size Summary')).toBeVisible(); await capture('19-pick-list');
  await page.locator('.modal').filter({ hasText: 'Package Size Summary' }).locator('.close-button').first().click();
  await page.getByRole('button', { name: /Reports/ }).click(); await expect(page.getByText('Production Reports')).toBeVisible(); await capture('20-production-reports');
  await page.locator('.modal').filter({ hasText: 'Production Reports' }).locator('.close-button').first().click();
  await page.getByRole('button', { name: 'Add Manual Product' }).click(); await expect(page.getByPlaceholder('Search products...')).toBeVisible(); await capture('21-add-manual-product');
});
