import { test, expect, TEST_USER } from './fixtures';

test('archiving a product with active orders preserves the existing orders', async ({ page }) => {
  // Log in via the API so the spec doesn't depend on the form's
  // submit handler (separate bug, tracked elsewhere).
  const login = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  });
  expect(login.status()).toBe(200);

  // Seed via API so we don't depend on UI flow for the precondition.
  const today = new Date().toISOString().slice(0, 10);
  const groupId = `group_${Date.now()}_test`;
  const productId = `prod_${Date.now()}_test`;

  // Need a batch type first
  await page.request.post('/api/batch-overrides', {
    data: { batch_type: 'standard', weight_lbs: 20 }
  });

  await page.request.post('/api/groups', {
    data: {
      id: groupId,
      label: 'Test Group',
      batch_type: 'standard',
      roast_loss_pct: 15,
      type: 'single_origin',
      components: [],
      active: true,
      created_at: today
    }
  });

  await page.request.post('/api/products', {
    data: {
      id: productId,
      name: 'Test Product 1lb',
      lbs: 1,
      group_id: groupId,
      active: true,
      created_at: today
    }
  });

  await page.request.post('/api/production-days', {
    data: { production_date: today, status: 'active' }
  });

  await page.request.post('/api/orders', {
    data: { id: `o_${Date.now()}`, product_id: productId, qty: 5, production_date: today }
  });

  // Legacy DELETE now archives rather than destroying historical records.
  const res = await page.request.delete(`/api/products?id=${productId}`);
  expect(res.status()).toBe(200);
  expect((await (await page.request.get(`/api/orders?date=${today}`)).json())[0].qty).toBe(5);
  expect((await (await page.request.get('/api/products')).json()).find((p: any) => p.id === productId).active).toBe(false);
});
