import { test, expect, TEST_USER } from './fixtures';

/**
 * Regression: before any roast day had ever been completed, GET
 * /api/leftovers?date= returned [] and ignored the leftovers a new tenant
 * had just typed in, so a reload showed zeros.
 */
test('manual leftovers survive before the first completed day, and after it', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  });
  expect(login.status()).toBe(200);

  const groupId = `g_${Date.now()}`;
  await page.request.post('/api/batch-overrides', { data: { batch_type: 'standard', weight_lbs: 20 } });
  await page.request.post('/api/groups', {
    data: {
      id: groupId, label: 'First Group', batch_type: 'standard', roast_loss_pct: 15,
      type: 'single_origin', components: [], active: true, created_at: '2026-10-01'
    }
  });

  // Day one: nothing completed yet. A typed leftover must come back.
  await page.request.post('/api/leftovers', { data: { group_id: groupId, lbs: 4.5 } });
  let res = await page.request.get('/api/leftovers?date=2026-10-02');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual([{ group_id: groupId, lbs: 4.5, tenant_id: expect.any(String) }]);

  // Complete day one. The server records the snapshot from database
  // state: the 4.5 lb the roaster confirmed is what carries forward.
  await page.request.post('/api/production-days', { data: { production_date: '2026-10-02', status: 'active' } });
  await page.request.patch('/api/production-days/2026-10-02', { data: { status: 'completed' } });

  // Day two reads the completed snapshot as its baseline.
  res = await page.request.get('/api/leftovers?date=2026-10-03');
  expect(await res.json()).toEqual([{ group_id: groupId, lbs: 4.5, tenant_id: expect.any(String) }]);

  // A manual correction entered after completion wins again.
  await page.request.post('/api/leftovers', { data: { group_id: groupId, lbs: 3.25 } });
  res = await page.request.get('/api/leftovers?date=2026-10-03');
  expect(await res.json()).toEqual([{ group_id: groupId, lbs: 3.25, tenant_id: expect.any(String) }]);
});
