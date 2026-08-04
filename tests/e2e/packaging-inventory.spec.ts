import { test, expect, TEST_USER } from './fixtures';

test('matches bags by product weight and commits inventory exactly once', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  });
  expect(login.status()).toBe(200);

  const date = '2026-08-04';
  const suffix = Date.now();
  const groupId = `packaging_group_${suffix}`;
  const twelveOunceProduct = `packaging_12oz_${suffix}`;
  const onePoundProduct = `packaging_1lb_${suffix}`;

  await page.request.post('/api/batch-overrides', {
    data: { batch_type: 'standard', weight_lbs: 20 }
  });
  await page.request.post('/api/groups', {
    data: {
      id: groupId,
      label: 'Packaging Test Group',
      batch_type: 'standard',
      roast_loss_pct: 0,
      type: 'single_origin',
      components: [],
      active: true,
      created_at: date
    }
  });
  await page.request.post('/api/products', {
    data: {
      id: twelveOunceProduct,
      name: 'Any Coffee 12 oz',
      lbs: 0.75,
      group_id: groupId,
      active: true,
      created_at: date
    }
  });
  await page.request.post('/api/products', {
    data: {
      id: onePoundProduct,
      name: 'Another Coffee 1 lb',
      lbs: 1,
      group_id: groupId,
      active: true,
      created_at: date
    }
  });
  await page.request.post('/api/production-days', {
    data: { production_date: date, status: 'active' }
  });
  await page.request.post('/api/orders', {
    data: { id: `order_12oz_${suffix}`, product_id: twelveOunceProduct, qty: 8, production_date: date }
  });
  await page.request.post('/api/orders', {
    data: { id: `order_1lb_${suffix}`, product_id: onePoundProduct, qty: 2, production_date: date }
  });

  const createPackaging = await page.request.post('/api/packaging', {
    data: { label: '12 oz kraft', size_oz: 12, on_hand_count: 100 }
  });
  expect(createPackaging.status()).toBe(201);

  const projected = await (await page.request.get(`/api/packaging?date=${date}`)).json();
  expect(projected.packaging).toHaveLength(1);
  expect(projected.packaging[0]).toMatchObject({
    size_oz: 12,
    on_hand_count: 100,
    required_count: 8,
    projected_remaining: 92
  });
  expect(projected.untracked).toEqual([{ size_oz: 16, required_count: 2 }]);

  const complete = await page.request.patch(`/api/production-days/${date}`, {
    data: { status: 'completed' }
  });
  expect(complete.status()).toBe(200);

  const completed = await (await page.request.get(`/api/packaging?date=${date}`)).json();
  expect(completed.day_status).toBe('completed');
  expect(completed.packaging[0]).toMatchObject({
    on_hand_count: 92,
    starting_count: 100,
    filled_count: 8,
    ending_count: 92
  });

  // Repeating completion must not consume the same order sheet again.
  const completeAgain = await page.request.patch(`/api/production-days/${date}`, {
    data: { status: 'completed' }
  });
  expect(completeAgain.status()).toBe(200);
  const inventoryAfterRepeat = await (await page.request.get('/api/packaging')).json();
  expect(inventoryAfterRepeat.packaging[0].on_hand_count).toBe(92);

  // Reopening reverses the committed usage so the order sheet can be edited
  // and completed again without drifting inventory.
  const reopen = await page.request.patch(`/api/production-days/${date}`, {
    data: { status: 'active' }
  });
  expect(reopen.status()).toBe(200);
  const inventoryAfterReopen = await (await page.request.get('/api/packaging')).json();
  expect(inventoryAfterReopen.packaging[0].on_hand_count).toBe(100);
});
