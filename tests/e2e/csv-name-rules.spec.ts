import { test, expect, TEST_USER, signupTenant } from './fixtures';

const csv = 'Name,Qty\nCoffee - 10.9oz plan: 123 Grind: Whole Bean,2\nCoffee - 10.9oz plan: 987 Grind: Whole Bean,3\nCoffee - 10.9oz plan: 456 Grind: Espresso,4';
const rules = '"plan: {number}"\n"Grind: Whole Bean"';

test('saved cleanup rules preview, persist, match and import without losing quantity', async ({ page, baseURL }, testInfo) => {
  const api = page.request;
  expect((await api.post('/api/auth/login', { data: TEST_USER })).ok()).toBe(true);
  await api.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } });
  const group = await (await api.post('/api/groups', {
    data: { label: 'Cleanup coffee', batch_type: 'standard', roast_loss_pct: 15, type: 'single_origin' }
  })).json();
  for (const name of ['Coffee - 10.9oz', 'Coffee - 10.9oz Grind: Espresso']) {
    expect((await api.post('/api/products', {
      data: { name, lbs: .68, group_id: group.id, packaging_mode: 'untracked' }
    })).status()).toBe(201);
  }
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Catalog/ }).click();
  await page.getByRole('button', { name: /^CSV Formats/ }).click();
  await page.getByRole('button', { name: '+ Add Format', exact: true }).click();
  await page.getByLabel('Format Name', { exact: true }).fill('Cleanup sample');
  await page.locator('input[type=file]').setInputFiles({
    name: 'synthetic.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)
  });
  await page.getByLabel('Column', { exact: true }).selectOption('name');
  await page.getByLabel('Quantity Column', { exact: true }).selectOption('qty');
  await page.getByLabel('Aggregate duplicate rows', { exact: false }).check();
  const editor = page.getByLabel('Name cleanup rules (optional)');
  await editor.fill('"bad {wildcard}"');
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();
  await editor.fill(rules);
  await expect(page.locator('.cleanup-preview tbody tr')).toHaveCount(3);
  await expect(page.locator('.cleanup-preview tbody tr').first()).toContainText('plan: 123');
  await expect(page.locator('.cleanup-preview tbody tr').first().locator('td').nth(1)).toHaveText('Coffee - 10.9oz');
  await page.locator('.cleanup-preview').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('cleanup-preview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const formatRow = page.getByRole('row').filter({ hasText: 'Cleanup sample' });
  await expect(formatRow).toBeVisible();
  await formatRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(editor).toHaveValue(rules);
  await page.getByRole('button', { name: 'Update', exact: true }).click();

  const format = (await (await api.get('/api/csv-formats')).json()).find((f: { name: string }) => f.name === 'Cleanup sample');
  expect(format.config.nameCleanupRules).toEqual(['plan: {number}', 'Grind: Whole Bean']);
  const input = { csvText: csv, productionDate: '2026-11-17', formatId: format.id };
  const preview = await (await api.post('/api/orders/import', { data: input })).json();
  expect(preview.unmatched).toBe(0);
  expect(preview.matches.map((m: { quantity: number }) => m.quantity)).toEqual([5, 4]);
  expect(preview.nameChanges).toHaveLength(3);
  const confirmed = await api.post('/api/orders/import', { data: { ...input, confirm: true } });
  expect(confirmed.ok()).toBe(true);
  expect((await confirmed.json()).created).toBe(2);
  const orders = await (await api.get('/api/orders?date=2026-11-17')).json();
  expect(orders.reduce((sum: number, row: { qty: number }) => sum + row.qty, 0)).toBe(9);

  const other = await signupTenant(baseURL!, 'cleanup-other');
  expect((await other.post('/api/orders/import', { data: input })).status()).toBe(400);
  expect((await other.put('/api/csv-formats', { data: format })).status()).toBe(404);
  await other.dispose();

  const invalid = await api.put('/api/csv-formats', { data: {
    ...format, config: { ...format.config, nameCleanupRules: ['{wildcard}'] }
  } });
  expect(invalid.status()).toBe(400);
  const empty = await api.post('/api/orders/import', {
    data: { ...input, csvText: 'Name,Qty\nplan: 123,2', confirm: true }
  });
  expect(empty.status()).toBe(400);
  expect((await empty.json()).error).toContain('entire product name');
  expect(await (await api.get('/api/orders?date=2026-11-17')).json()).toHaveLength(2);

  const cleared = await api.put('/api/csv-formats', { data: {
    ...format, config: { ...format.config, nameCleanupRules: [] }
  } });
  expect(cleared.ok()).toBe(true);
  const original = await (await api.post('/api/orders/import', { data: input })).json();
  expect(original.matches).toHaveLength(3);
  expect(original.nameChanges).toEqual([]);
});
