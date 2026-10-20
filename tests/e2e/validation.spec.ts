import { test, expect, TEST_USER } from './fixtures';

test('mutating routes reject bad input with 400 and a message', async ({ page }) => {
  const api = page.request;
  expect((await api.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).status()).toBe(200);
  await api.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } });
  const group = await (await api.post('/api/groups', {
    data: { label: 'G', batch_type: 'standard', roast_loss_pct: 15, type: 'single_origin' }
  })).json();
  expect(group.id).toMatch(/^group_/);
  expect(group.created_at).toBeTruthy();

  const cases: Array<[string, string, object, RegExp]> = [
    ['post', '/api/groups', { label: 'x', batch_type: 'standard', roast_loss_pct: 120, type: 'single_origin' }, /roast_loss_pct/],
    ['post', '/api/groups', { label: 'x', batch_type: 'standard', roast_loss_pct: 10, type: 'espresso' }, /type must be one of/],
    ['post', '/api/groups', { id: 'has spaces', label: 'x', batch_type: 'standard', roast_loss_pct: 10, type: 'blend' }, /id must be/],
    ['post', '/api/products', { name: 'x', lbs: -1, group_id: group.id }, /lbs/],
    ['post', '/api/products', { name: 'x', lbs: 1, group_id: 'nope' }, /group_id/],
    ['post', '/api/orders', { product_id: 'nope', qty: 1, production_date: '2026-10-20' }, /product_id/],
    ['post', '/api/leftovers', { group_id: group.id, lbs: -3 }, /lbs/],
    ['post', '/api/batch-overrides', { batch_type: 'x', weight_lbs: 0 }, /weight_lbs/],
    ['post', '/api/production-days', { production_date: '10/20/2026' }, /production_date/],
    ['post', '/api/csv-formats', { name: 'x', config: { quantityColumn: 'q' } }, /productNameColumn/],
    ['post', '/api/auth/signup', { username: 'ab', email: 'x@y', password: 'longenough1', tenantName: 'T' }, /Username/],
    ['post', '/api/auth/signup', { username: 'validname', email: 'nope', password: 'longenough1', tenantName: 'T' }, /Email/]
  ];
  for (const [method, path, data, message] of cases) {
    const res = await (api as any)[method](path, { data });
    expect(res.status(), `${method} ${path}`).toBe(400);
    expect((await res.json()).error, `${method} ${path}`).toMatch(message);
  }

  const product = await (await api.post('/api/products', { data: { name: 'P', lbs: 1, group_id: group.id } })).json();
  await api.post('/api/production-days', { data: { production_date: '2026-10-20', status: 'active' } });
  const orderCases: Array<[object, RegExp]> = [
    [{ product_id: product.id, qty: 0, production_date: '2026-10-20' }, /qty/],
    [{ product_id: product.id, qty: 1.5, production_date: '2026-10-20' }, /qty/],
    [{ product_id: product.id, qty: 1, production_date: 'soon' }, /production_date/]
  ];
  for (const [data, message] of orderCases) {
    const res = await api.post('/api/orders', { data });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(message);
  }

  // Non-JSON and non-object bodies are 400, not 500.
  const raw = await api.post('/api/groups', { headers: { 'Content-Type': 'application/json' }, data: '[1,2]' });
  expect(raw.status()).toBe(400);
});
