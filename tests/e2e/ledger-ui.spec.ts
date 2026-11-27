import { test, expect, TEST_USER } from './fixtures';

test('ledger expands orders, persists leftovers and fits both themes on mobile', async ({ page }, testInfo) => {
  await page.request.post('/api/auth/login', { data: TEST_USER });
  await page.request.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } });
  const group = await (await page.request.post('/api/groups', { data: { label: 'Morning coffee', batch_type: 'standard', roast_loss_pct: 15, type: 'single_origin' } })).json();
  const product = await (await page.request.post('/api/products', { data: { name: 'House blend', lbs: 1, group_id: group.id, packaging_mode: 'untracked' } })).json();
  const date = '2026-11-25';
  await page.request.post('/api/production-days', { data: { production_date: date, status: 'active' } });
  await page.request.post('/api/orders', { data: { product_id: product.id, qty: 4, production_date: date } });
  await page.goto(`/planner?date=${date}`);
  await page.waitForLoadState('networkidle');
  const toggle = page.getByRole('button', { name: /Morning coffee/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('row').filter({ hasText: 'House blend' })).toHaveCount(0);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('row').filter({ hasText: 'House blend' })).toContainText('4.00 lb');
  const leftover = page.getByLabel('Morning coffee leftover (lb)');
  await leftover.fill('1.5');
  await leftover.press('Tab');
  await expect.poll(async () => (await (await page.request.get(`/api/leftovers?date=${date}`)).json())[0]?.lbs).toBe(1.5);
  await page.reload();
  await expect(leftover).toHaveValue('1.50');
  await toggle.click();
  for (const theme of ['light', 'dark']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: 'Toggle theme' }).click();
    const pickList = page.getByRole('button', {name: 'Pick List', exact: true});
    await pickList.hover();
    await expect(pickList).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(pickList).toHaveCSS('border-bottom-color', theme === 'dark' ? 'rgb(240, 99, 75)' : 'rgb(210, 64, 42)');
    await page.screenshot({ path: testInfo.outputPath(`ledger-${theme}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Every metric and the removal action must fit without sideways scrolling.
    const ledger = page.getByRole('table');
    await expect.poll(() => ledger.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const cell of await ledger.getByRole('cell').all()) {
      if (!await cell.isVisible()) continue;
      const box = await cell.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await toggle.click();
    await expect(page.getByRole('row').filter({ hasText: 'House blend' })).toHaveCount(0);
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Remove House blend from production day' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`ledger-${theme}-mobile.png`), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove House blend from production day' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'House blend' })).toHaveCount(0);
});
