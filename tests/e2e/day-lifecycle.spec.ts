import { test, expect, TEST_USER } from './fixtures';

test('completing a day writes a server-side snapshot that feeds the next day, and deleting a day takes its orders with it', async ({ page }) => {
  const api = page.request;
  expect((await api.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).status()).toBe(200);

  await api.post('/api/batch-overrides', { data: { batch_type: 'decaf', weight_lbs: 10 } });
  const group = await (await api.post('/api/groups', {
    data: { label: 'Decaf', batch_type: 'decaf', roast_loss_pct: 0, type: 'single_origin' }
  })).json();
  const product = await (await api.post('/api/products', {
    data: { name: 'Decaf 1lb', lbs: 1, group_id: group.id }
  })).json();

  // Day 1: 15 lb ordered, no leftover, 10 lb batches -> 2 batches roasted,
  // 5 lb predicted left over.
  await api.post('/api/production-days', { data: { production_date: '2026-10-20', status: 'active' } });
  await api.post('/api/orders', { data: { product_id: product.id, qty: 15, production_date: '2026-10-20' } });
  expect((await api.patch('/api/production-days/2026-10-20', { data: { status: 'completed' } })).status()).toBe(200);

  const snapshot = await (await api.get('/api/snapshots?date=2026-10-20')).json();
  expect(snapshot.summary.orders).toEqual([{ product_name: 'Decaf 1lb', qty: 15 }]);
  expect(snapshot.summary.leftovers).toEqual({ [group.id]: 5 });
  expect(snapshot.summary.batchOverrides).toEqual({ decaf: 10 });
  expect(snapshot.summary.computed_at).toBeTruthy();

  // Day 2 starts from that 5 lb.
  const carried = await (await api.get('/api/leftovers?date=2026-10-21')).json();
  expect(carried).toEqual([{ group_id: group.id, lbs: 5, tenant_id: expect.any(String) }]);

  // The snapshot endpoint is read-only now.
  expect((await api.post('/api/snapshots', { data: { production_date: '2026-10-20', leftovers: { [group.id]: 999 } } })).status()).toBe(405);

  // Only one active day at a time, enforced even on direct inserts.
  await api.post('/api/production-days', { data: { production_date: '2026-10-21', status: 'active' } });
  const second = await api.post('/api/production-days', { data: { production_date: '2026-10-22', status: 'active' } });
  expect(second.status()).toBe(409);
  expect((await second.json()).activeDay).toBe('2026-10-21');

  // Deleting a day removes its orders and snapshot too.
  await api.post('/api/orders', { data: { product_id: product.id, qty: 4, production_date: '2026-10-21' } });
  expect((await api.delete('/api/production-days/2026-10-21')).status()).toBe(200);
  expect(await (await api.get('/api/orders?date=2026-10-21')).json()).toEqual([]);
  expect((await api.delete('/api/production-days/2026-10-20')).status()).toBe(200);
  expect(await (await api.get('/api/snapshots?date=2026-10-20')).json()).toBeNull();
  expect(await (await api.get('/api/orders?date=2026-10-20')).json()).toEqual([]);
});

test('activating a completed day returns a conflict and preserves its committed packaging', async ({ page }) => {
  const api = page.request;
  expect((await api.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).status()).toBe(200);
  expect((await api.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } })).ok()).toBeTruthy();
  const group = await (await api.post('/api/groups', {
    data: { label: 'House', batch_type: 'standard', roast_loss_pct: 0, type: 'single_origin' }
  })).json();
  const product = await (await api.post('/api/products', {
    data: { name: 'House 12oz', lbs: 0.75, group_id: group.id }
  })).json();
  expect((await api.post('/api/packaging', {
    data: { label: '12 oz bags', size_value: 12, size_unit: 'oz', on_hand_count: 100 }
  })).status()).toBe(201);
  expect((await api.post('/api/production-days', { data: { production_date: '2026-10-20', status: 'scheduled' } })).ok()).toBeTruthy();
  expect((await api.post('/api/orders', { data: { product_id: product.id, qty: 4, production_date: '2026-10-20' } })).ok()).toBeTruthy();
  expect((await api.patch('/api/production-days/2026-10-20', { data: { status: 'completed' } })).status()).toBe(200);
  expect((await api.post('/api/production-days', { data: { production_date: '2026-10-21', status: 'active' } })).ok()).toBeTruthy();

  const response = await api.patch('/api/production-days/2026-10-20', { data: { status: 'active' } });
  expect(response.status()).toBe(409);
  expect(await response.json()).toMatchObject({ activeDay: '2026-10-21' });

  const days = (await (await api.get('/api/production-days')).json()).days;
  expect(days.find((day: { production_date: string }) => day.production_date === '2026-10-20').status).toBe('completed');
  const packaging = (await (await api.get('/api/packaging?date=2026-10-20')).json()).packaging;
  expect(packaging[0].on_hand_count).toBe(96);
});
