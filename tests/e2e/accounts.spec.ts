import { request as playwrightRequest } from '@playwright/test';
import { test, expect, TEST_USER, signupTenant, lastMailToken, outbox } from './fixtures';

test('signup sends a verification link that verifies the account', async ({ baseURL }) => {
  const ctx = await signupTenant(baseURL!, 'verify-me');
  let me = await (await ctx.get('/api/auth/me')).json();
  expect(me.user.role).toBe('owner');
  expect(me.user.email_verified_at).toBeNull();

  const token = lastMailToken('verify-me@example.com', /verify/i);
  const anon = await playwrightRequest.newContext({ baseURL });
  expect((await anon.post('/api/auth/verify', { data: { token } })).status()).toBe(200);
  // One-time: a second use fails.
  expect((await anon.post('/api/auth/verify', { data: { token } })).status()).toBe(400);

  me = await (await ctx.get('/api/auth/me')).json();
  expect(me.user.email_verified_at).not.toBeNull();

  // Resend is a no-op once verified.
  expect((await (await ctx.post('/api/auth/resend-verification')).json()).already).toBe(true);
  await anon.dispose();
  await ctx.dispose();
});

test('password reset emails a link, changes the password, and signs out other sessions', async ({ page, baseURL }) => {
  const api = page.request;
  expect((await api.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).status()).toBe(200);

  const anon = await playwrightRequest.newContext({ baseURL });
  // Unknown addresses get the same answer, and no mail.
  expect((await anon.post('/api/auth/password-reset/request', { data: { email: 'nobody@example.com' } })).status()).toBe(200);
  expect(outbox().filter((m) => m.to === 'nobody@example.com')).toHaveLength(0);

  expect((await anon.post('/api/auth/password-reset/request', { data: { email: TEST_USER.email } })).status()).toBe(200);
  const token = lastMailToken(TEST_USER.email, /reset/i);

  expect((await anon.post('/api/auth/password-reset/confirm', { data: { token, password: 'short' } })).status()).toBe(400);
  expect((await anon.post('/api/auth/password-reset/confirm', { data: { token, password: 'brand-new-pass-1' } })).status()).toBe(200);
  expect((await anon.post('/api/auth/password-reset/confirm', { data: { token, password: 'brand-new-pass-2' } })).status()).toBe(400);

  // The session that was logged in before the reset is gone.
  expect((await api.get('/api/auth/me')).status()).toBe(401);
  expect((await anon.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).status()).toBe(401);
  expect((await anon.post('/api/auth/login', { data: { username: TEST_USER.username, password: 'brand-new-pass-1' } })).status()).toBe(200);
  await anon.dispose();
});

test('owners invite staff, staff cannot manage the team, and removal ends sessions', async ({ page, baseURL }) => {
  const owner = page.request;
  expect((await owner.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } })).status()).toBe(200);

  expect((await owner.post('/api/tenant/invites', { data: { email: 'not-an-email', role: 'staff' } })).status()).toBe(400);
  expect((await owner.post('/api/tenant/invites', { data: { email: TEST_USER.email, role: 'staff' } })).status()).toBe(409);
  expect((await owner.post('/api/tenant/invites', { data: { email: 'Roaster@Example.com', role: 'staff' } })).status()).toBe(201);
  expect((await (await owner.get('/api/tenant/invites')).json()).invites).toHaveLength(1);

  const token = lastMailToken('roaster@example.com', /invited/i);
  const staff = await playwrightRequest.newContext({ baseURL });
  const lookup = await (await staff.get(`/api/auth/accept-invite?token=${token}`)).json();
  expect(lookup).toEqual({ email: 'roaster@example.com', role: 'staff', tenant: TEST_USER.tenantName });
  expect((await staff.post('/api/auth/accept-invite', { data: { token, username: TEST_USER.username, password: 'staffpass-1234' } })).status()).toBe(409);
  expect((await staff.post('/api/auth/accept-invite', { data: { token, username: 'roaster', password: 'staffpass-1234' } })).status()).toBe(200);
  expect((await staff.post('/api/auth/accept-invite', { data: { token, username: 'roaster2', password: 'staffpass-1234' } })).status()).toBe(400);

  const staffMe = await (await staff.get('/api/auth/me')).json();
  expect(staffMe.user.role).toBe('staff');
  expect(staffMe.user.email_verified_at).not.toBeNull();
  expect(staffMe.tenant.name).toBe(TEST_USER.tenantName);

  // Staff work in the planner but do not manage accounts.
  expect((await staff.get('/api/groups')).status()).toBe(200);
  expect((await staff.get('/api/tenant/users')).status()).toBe(200);
  expect((await staff.get('/api/tenant/invites')).status()).toBe(403);
  expect((await staff.post('/api/tenant/invites', { data: { email: 'x@example.com', role: 'owner' } })).status()).toBe(403);

  const members = (await (await owner.get('/api/tenant/users')).json()).users;
  expect(members.map((m: { username: string }) => m.username).sort()).toEqual(['roaster', TEST_USER.username]);
  const ownerId = members.find((m: { username: string }) => m.username === TEST_USER.username).id;
  const staffId = members.find((m: { username: string }) => m.username === 'roaster').id;

  // Guard rails: no removing yourself, no demoting the last owner.
  expect((await owner.delete(`/api/tenant/users?id=${ownerId}`)).status()).toBe(400);
  expect((await owner.patch('/api/tenant/users', { data: { id: ownerId, role: 'staff' } })).status()).toBe(400);
  expect((await owner.patch('/api/tenant/users', { data: { id: staffId, role: 'owner' } })).status()).toBe(200);
  expect((await owner.patch('/api/tenant/users', { data: { id: ownerId, role: 'staff' } })).status()).toBe(200);
  expect((await owner.patch('/api/tenant/users', { data: { id: staffId, role: 'staff' } })).status()).toBe(403);
  // Restore and remove the staff member; their session dies with them.
  expect((await staff.patch('/api/tenant/users', { data: { id: ownerId, role: 'owner' } })).status()).toBe(200);
  expect((await owner.delete(`/api/tenant/users?id=${staffId}`)).status()).toBe(200);
  expect((await staff.get('/api/auth/me')).status()).toBe(401);
  await staff.dispose();
});

test('repeated failed logins are rate limited', async ({ baseURL }) => {
  const anon = await playwrightRequest.newContext({ baseURL });
  for (let i = 0; i < 10; i++) {
    expect((await anon.post('/api/auth/login', { data: { username: TEST_USER.username, password: 'wrong' } })).status()).toBe(401);
  }
  const blocked = await anon.post('/api/auth/login', { data: { username: TEST_USER.username, password: TEST_USER.password } });
  expect(blocked.status()).toBe(429);
  await anon.dispose();
});
