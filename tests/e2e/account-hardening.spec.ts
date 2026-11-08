import { test, expect, TEST_USER, outbox } from './fixtures';
import { MAIL_OUTBOX } from '../../playwright.config';
import fs from 'node:fs';

test('concurrent signups cannot exceed the address limit', async ({ page }) => {
  // The fixture already performed one signup from this address. Invalid
  // bodies still consume a slot so they cannot bypass the request limit.
  const responses = await Promise.all(Array.from({ length: 8 }, () =>
    page.request.post('/api/auth/signup', { data: {} })
  ));
  const statuses = responses.map((response) => response.status());
  expect(statuses.filter((status) => status === 400)).toHaveLength(4);
  expect(statuses.filter((status) => status === 429)).toHaveLength(4);

  // Signup throttling uses a separate key and does not block a valid login.
  expect((await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  })).status()).toBe(200);
});

test('verification resends are limited per unverified user', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  })).status()).toBe(200);

  const responses = await Promise.all(Array.from({ length: 8 }, () =>
    page.request.post('/api/auth/resend-verification')
  ));
  expect(responses.filter((response) => response.status() === 200)).toHaveLength(5);
  expect(responses.filter((response) => response.status() === 429)).toHaveLength(3);
  const mails = outbox().filter((mail) => mail.to === TEST_USER.email && /verify/i.test(mail.subject));
  expect(mails).toHaveLength(6);
  const tokens = mails.map((mail) => mail.text.match(/token=([0-9a-f]+)/)![1]);
  for (const token of tokens.slice(0, -1)) {
    expect((await page.request.post('/api/auth/verify', { data: { token } })).status()).toBe(400);
  }
  expect((await page.request.post('/api/auth/verify', { data: { token: tokens.at(-1) } })).status()).toBe(200);
});

test('the verification banner explains when resend requests are limited', async ({ page }) => {
  expect((await page.request.post('/api/auth/login', {
    data: { username: TEST_USER.username, password: TEST_USER.password }
  })).status()).toBe(200);
  for (let i = 0; i < 5; i++) {
    expect((await page.request.post('/api/auth/resend-verification')).status()).toBe(200);
  }
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const response = page.waitForResponse((res) => res.url().endsWith('/api/auth/resend-verification'));
  await page.getByRole('button', { name: 'Resend link' }).click();
  expect((await response).status()).toBe(429);
  await expect(page.getByRole('alert')).toContainText('Too many verification requests');
});

test('a reset delivery failure does not disclose whether an account exists', async ({ page }) => {
  // Cause the file transport to fail without changing server configuration.
  fs.chmodSync(MAIL_OUTBOX, 0o400);
  try {
    const unknown = await page.request.post('/api/auth/password-reset/request', { data: { email: 'missing@example.com' } });
    const known = await page.request.post('/api/auth/password-reset/request', { data: { email: TEST_USER.email } });
    expect(unknown.status()).toBe(200);
    expect(known.status()).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  } finally {
    fs.chmodSync(MAIL_OUTBOX, 0o600);
  }
});
