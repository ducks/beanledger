import { test, expect, TEST_USER } from './fixtures';

test('archiving a product and group preserves orders, snapshots and packaging reports', async ({ page }) => {
  const api = page.request;
  await api.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } });
  await api.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } });
  const group = await (await api.post('/api/groups', { data: { label: 'Historical coffee', batch_type: 'standard', roast_loss_pct: 15, type: 'single_origin' } })).json();
  const product = await (await api.post('/api/products', { data: { name: 'Historical coffee 12oz', lbs: .75, group_id: group.id } })).json();
  const date = '2026-10-20';
  await api.post('/api/production-days', { data: { production_date: date, status: 'active' } });
  await api.post('/api/packaging', { data: { label: '12oz', size_value: 12, size_unit: 'oz', on_hand_count: 100 } });
  expect((await api.post('/api/orders', { data: { product_id: product.id, qty: 4, production_date: date } })).status()).toBe(201);
  expect((await api.patch(`/api/production-days/${date}`, { data: { status: 'completed' } })).status()).toBe(200);
  const orders = await (await api.get(`/api/orders?date=${date}`)).json();
  const snapshot = await (await api.get(`/api/snapshots?date=${date}`)).json();
  const packaging = await (await api.get(`/api/packaging?dateFrom=${date}&dateTo=${date}`)).json();
  expect(orders).toHaveLength(1);
  expect(snapshot).not.toBeNull();
  expect(packaging.packaging[0].filled_count).toBe(4);
  expect((await api.delete(`/api/products?id=${product.id}`)).status()).toBe(200);
  expect(await (await api.get(`/api/orders?date=${date}`)).json()).toEqual(orders);
  expect((await api.post('/api/orders', { data: { product_id: product.id, qty: 1, production_date: date } })).status()).toBe(400);
  // Restoring is reversible; archiving the group must archive its active products too.
  expect((await api.put('/api/products', { data: { ...product, active: true } })).status()).toBe(200);
  expect((await api.delete(`/api/groups?id=${group.id}`)).status()).toBe(200);
  expect(await (await api.get(`/api/orders?date=${date}`)).json()).toEqual(orders);
  expect(await (await api.get(`/api/snapshots?date=${date}`)).json()).toEqual(snapshot);
  expect(await (await api.get(`/api/packaging?dateFrom=${date}&dateTo=${date}`)).json()).toEqual(packaging);
  expect((await (await api.get('/api/products')).json()).find((p: any) => p.id === product.id).active).toBe(false);
  expect((await api.post('/api/orders', { data: { product_id: product.id, qty: 1, production_date: date } })).status()).toBe(400);
  await page.goto('/planner?date=' + date);
  await expect(async () => {
    if (!(await page.getByText('Production Reports', { exact: true }).isVisible())) {
      await page.getByRole('button', { name: /Reports/ }).click();
    }
    await expect(page.getByText('Production Reports', { exact: true })).toBeVisible();
  }).toPass();
  await expect(page.locator('.modal').getByText('Historical coffee', { exact: true })).toBeVisible();
  await expect(page.locator('.size-label')).toHaveText('12 oz');
  await page.locator('.modal .close-button').click();
  await page.getByRole('button', { name: /Catalog/ }).click();
  await expect(page.getByText('Historical coffee 12oz', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Archived', exact: true }).click();
  await expect(page.getByText('Historical coffee 12oz', { exact: true })).toBeVisible();
});
