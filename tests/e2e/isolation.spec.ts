import { test, expect, TEST_USER, signupTenant } from './fixtures';

/**
 * Two tenants, A (the seeded test user) and B. Everything A creates must
 * be invisible to B through every read, and untouchable through every
 * write, including by guessing ids.
 */
test('a second tenant cannot see or touch another tenant\'s data', async ({ page, baseURL }) => {
  const a = page.request;
  expect((await a.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).status()).toBe(200);
  const b = await signupTenant(baseURL!, 'tenant-b');

  const date = '2026-10-10';
  await a.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } });
  const group = await (await a.post('/api/groups', {
    data: { id: 'shared-id', label: 'A Group', batch_type: 'standard', roast_loss_pct: 15, type: 'single_origin' }
  })).json();
  const product = await (await a.post('/api/products', {
    data: { id: 'shared-id', name: 'A Product 1lb', lbs: 1, group_id: group.id }
  })).json();
  await a.post('/api/production-days', { data: { production_date: date, status: 'active' } });
  const order = await (await a.post('/api/orders', {
    data: { id: 'shared-id', product_id: product.id, qty: 5, production_date: date }
  })).json();
  await a.post('/api/leftovers', { data: { group_id: group.id, lbs: 2 } });
  const alias = await (await a.post('/api/aliases', { data: { alias_name: 'A Alias', product_id: product.id } })).json();
  const format = await (await a.post('/api/csv-formats', {
    data: { name: 'A Format', config: { productNameColumn: 'name', quantityColumn: 'qty' } }
  })).json();
  await a.post('/api/packaging', { data: { label: '1 lb bag', size_value: 16, size_unit: 'oz', on_hand_count: 10 } });

  // Reads: B sees nothing of A's.
  for (const path of ['/api/groups', '/api/products', '/api/aliases', '/api/csv-formats', '/api/batch-overrides', '/api/leftovers', `/api/orders?date=${date}`, `/api/leftovers?date=${date}`]) {
    const res = await b.get(path);
    expect(res.status(), path).toBe(200);
    expect(await res.json(), path).toEqual([]);
  }
  expect((await (await b.get('/api/production-days')).json()).days).toEqual([]);
  expect((await (await b.get(`/api/imports?date=${date}`)).json()).imports).toEqual([]);
  expect((await (await b.get(`/api/packaging?date=${date}`)).json()).packaging).toEqual([]);
  expect(await (await b.get(`/api/snapshots?date=${date}`)).json()).toBeNull();

  // Writes by id: B cannot update, delete, or attach to A's rows.
  expect((await b.put('/api/groups', { data: { ...group, label: 'hijacked' } })).status()).toBe(404);
  expect((await b.put('/api/products', { data: { ...product, name: 'hijacked' } })).status()).toBe(400);
  expect((await b.put('/api/orders', { data: { ...order, qty: 999 } })).status()).toBe(400);
  expect((await b.post('/api/orders', { data: { product_id: product.id, qty: 1, production_date: date } })).status()).toBe(400);
  expect((await b.post('/api/leftovers', { data: { group_id: group.id, lbs: 99 } })).status()).toBe(400);
  expect((await b.put('/api/aliases', { data: { ...alias, alias_name: 'hijacked' } })).status()).toBe(400);
  expect((await b.put('/api/csv-formats', { data: { ...format, name: 'hijacked' } })).status()).toBe(404);
  expect((await b.delete(`/api/groups?id=${group.id}`)).status()).toBe(404);
  expect((await b.delete(`/api/products?id=${product.id}`)).status()).toBe(404);
  expect((await b.delete(`/api/orders?id=${order.id}`)).status()).toBe(404);
  expect((await b.delete(`/api/aliases?id=${alias.id}`)).status()).toBe(404);
  expect((await b.delete(`/api/csv-formats?id=${format.id}`)).status()).toBe(404);
  expect((await b.patch(`/api/production-days/${date}`, { data: { status: 'completed' } })).status()).toBe(404);
  expect((await b.delete(`/api/production-days/${date}`)).status()).toBe(404);

  // The same ids are free for B to use: keys are tenant-scoped.
  expect((await b.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 12 } })).status()).toBe(201);
  const bGroup = await b.post('/api/groups', { data: { id: 'shared-id', label: 'B Group', batch_type: 'standard', roast_loss_pct: 10, type: 'blend' } });
  expect(bGroup.status()).toBe(201);
  const bProduct = await b.post('/api/products', { data: { id: 'shared-id', name: 'B Product', lbs: 0.75, group_id: 'shared-id' } });
  expect(bProduct.status()).toBe(201);
  await b.post('/api/production-days', { data: { production_date: date, status: 'active' } });
  const bOrder = await b.post('/api/orders', { data: { id: 'shared-id', product_id: 'shared-id', qty: 3, production_date: date } });
  expect(bOrder.status()).toBe(201);

  // And A's data is unchanged afterwards.
  expect((await (await a.get('/api/groups')).json())[0].label).toBe('A Group');
  expect((await (await a.get(`/api/orders?date=${date}`)).json())[0].qty).toBe(5);
  expect((await (await a.get(`/api/leftovers`)).json())[0].lbs).toBe(2);

  await b.dispose();
});
