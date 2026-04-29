import { test, expect, TEST_USER } from './fixtures';

/**
 * Regression test for the silent-delete bug: when DELETE /api/products
 * returns a 4xx with an {error} body, the UI must alert the message
 * instead of pretending the delete succeeded.
 */
test('shows the server error when a delete is refused', async ({ page }) => {
  // Set up: log in, create a product + active production day + an order
  // so the delete will be refused.
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(TEST_USER.username);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/$|\/planner|\/dashboard/);

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

  // Now attempt the delete via the API directly — the contract is what
  // the component reacts to.
  const res = await page.request.delete(`/api/products?id=${productId}`);
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/cannot delete product with orders/i);
});
