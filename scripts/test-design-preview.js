// Run after build-design-preview.js. Requires Playwright Chromium and Python 3.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
fs.mkdirSync('artifacts/preview-site/beanledger', { recursive: true });
try { fs.symlinkSync(path.resolve('artifacts/design-preview'), 'artifacts/preview-site/beanledger/design-system', 'dir'); }
catch (err) { if (err.code !== 'EEXIST') throw err; }
const server = spawn('python3', ['-m', 'http.server', '5181', '--bind', '127.0.0.1', '--directory', 'artifacts/preview-site'], { stdio: 'ignore' });
let browser;
try {
  await new Promise(r => setTimeout(r, 1000));
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://127.0.0.1:5181/beanledger/design-system/');
  await expect(page.getByRole('heading', {name:'Choose a workspace to explore.'})).toBeVisible();
  await expect(page.getByRole('navigation', {name:'Interactive design concepts'}).getByRole('link')).toHaveCount(4);
  await page.getByRole('link', {name:'component playground', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Component playground', exact:true})).toBeVisible();
  await expect(page.getByRole('navigation', {name:'Prototype navigation'})).toHaveCount(0);
  await page.getByRole('link', {name:'Design gallery'}).click();
  await expect(page.getByRole('heading', {name:'Choose a workspace to explore.'})).toBeVisible();
  for (const concept of ['studio', 'workbench', 'guided', 'ledger']) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`http://127.0.0.1:5181/beanledger/design-system/${concept}/`);
    await page.getByRole('button', { name: 'Try the interactive roast planner' }).click();
    await page.getByRole('button', { name: 'Try custom CSV mapping' }).click();
    await page.getByLabel('Product column').selectOption('Item');
    await page.getByLabel('Quantity column').selectOption('Units');
    await page.getByRole('button', { name: 'Preview mapped orders' }).click();
    await page.getByLabel('House blend · 12 oz quantity').fill('-1');
    await expect(page.getByRole('button', { name: 'Plan these batches' })).toBeDisabled();
    await page.getByLabel('House blend · 12 oz quantity').fill('28');
    await page.getByRole('button', { name: 'Plan these batches' }).click();
    await page.getByLabel('Green batch size (lb)').fill('10');
    await expect(page.getByText('2 × 10 lb').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Dark preview', exact: true }).click();
    await page.screenshot({ path: `artifacts/design-planners/${concept}-mobile-dark.png`, fullPage: true });
    await page.getByRole('button', { name: 'Review packing' }).click();
    await expect(page.getByRole('button', { name: 'Complete sample roast' })).toBeDisabled();
    await page.getByRole('button', { name: 'Receive 50 sample bags' }).click();
    await page.getByRole('button', { name: 'Complete sample roast' }).click();
    await expect(page.getByRole('heading', { name: 'Ready for the next roast.' })).toBeVisible();
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await expect(page.getByRole('heading', { name: 'What are we roasting?' })).toBeVisible();
    const navigation = page.getByRole('navigation', { name: 'Workspace navigation', exact: true });
    await navigation.getByRole('button', { name: 'Catalog', exact: true }).click();
    await page.getByRole('button', { name: 'Edit House blend · 12 oz', exact: true }).click();
    await page.getByLabel('Packaging', { exact: true }).selectOption('trade');
    await page.getByRole('button', { name: 'Save product', exact: true }).click();
    await navigation.getByRole('button', { name: 'Packing preview', exact: true }).click();
    await expect(page.getByRole('row').filter({hasText:'10.9oz TRADE'}).getByRole('cell')).toHaveText(['200','24','176']);
    await navigation.getByRole('button', { name: 'Roast planner', exact: true }).click();
    await page.getByRole('button', {name:'Load sample orders'}).click();
    await page.getByLabel('House blend · 12 oz quantity').fill('30');
    await navigation.getByRole('button', { name: 'Packing preview', exact: true }).click();
    await expect(page.getByRole('row').filter({hasText:'10.9oz TRADE'}).getByRole('cell')).toHaveText(['200','30','170']);
    await navigation.getByRole('button', { name: 'Import review', exact: true }).click();
    await page.getByRole('button', { name:'Create product & review packaging' }).click();
    await page.getByLabel('Packaging', { exact:true }).selectOption('trade');
    await page.getByRole('button', { name:'Create product & import 8 bags' }).click();
    await expect(page.getByRole('row').filter({hasText:'10.9oz TRADE'}).getByRole('cell')).toHaveText(['200','38','162']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`artifacts/design-planners/${concept}-packaging-mobile-dark.png`,fullPage:true});
    console.log(`PASS ${concept}: shared catalog, import, planner quantities, packaging,  mapping, validation, calculation, mobile, dark, packing, completion, reset`);
  }
  expect(errors).toEqual([]);
} finally { await browser?.close(); server.kill(); }
