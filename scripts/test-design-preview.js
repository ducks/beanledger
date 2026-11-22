// Build first. Static synthetic preview only; no app server or database.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
fs.mkdirSync('artifacts/preview-site/beanledger', {recursive:true});
fs.mkdirSync('artifacts/appearance', {recursive:true});
try { fs.symlinkSync(path.resolve('artifacts/design-preview'), 'artifacts/preview-site/beanledger/design-system', 'dir'); }
catch(error) { if(error.code!=='EEXIST') throw error; }
const server=spawn('python3',['-m','http.server','5181','--bind','127.0.0.1','--directory','artifacts/preview-site'],{stdio:'ignore'});
let browser;
try {
  await new Promise(resolve=>setTimeout(resolve,1000));
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1600,height:1100}});
  const errors=[], requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>requests.push(request.url()));
  const base='http://127.0.0.1:5181/beanledger/design-system/';
  await page.goto(base);
  await expect(page.getByRole('heading',{name:'Same work. Different character.'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Workspace navigation',exact:true})).toHaveCount(0);
  const preview=page.locator('.current-preview');
  await preview.getByLabel('House blend leftover (lb)').fill('3');
  for(const [palette,font] of [['service','bricolage'],['studio','space'],['soft','fraunces']]) {
    await page.locator(`.preset-row button`).nth(['service','studio','soft'].indexOf(palette)).click();
    await expect(page.getByLabel('Wordmark font',{exact:true})).toHaveValue(font);
    await expect(preview.getByLabel('House blend leftover (lb)')).toHaveValue('3');
    await page.evaluate(()=>document.fonts.ready);
    expect(await page.locator('.specimen-word').evaluate(el=>document.fonts.check('700 32px '+getComputedStyle(el).fontFamily))).toBe(true);
    await page.screenshot({path:`artifacts/appearance/${palette}-desktop.png`,fullPage:true});
    for(const mode of ['light','dark']) {
      if(mode==='dark') await page.getByRole('button',{name:'Switch to dark'}).click();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for(const name of ['Catalog','Reports','Packaging']) {
        const opener=preview.getByRole('button',{name,exact:true});
        await opener.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('dialog').getByRole('heading',{name,exact:true})).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(opener).toBeFocused();
      }
      if(mode==='dark') await page.screenshot({path:`artifacts/appearance/${palette}-dark.png`,fullPage:true});
    }
    await page.getByRole('button',{name:'Switch to light'}).click();
  }
  // Palette and type can be mixed independently, without replacing sample state.
  await page.getByLabel('Wordmark font',{exact:true}).selectOption('bricolage');
  await page.getByLabel('Color palette').selectOption('studio');
  await expect(page.getByLabel('Wordmark font',{exact:true})).toHaveValue('bricolage');
  await page.getByLabel('Interface font').selectOption('space');
  await page.getByRole('button',{name:'Switch to dark'}).click();
  await page.getByLabel('Mascot',{exact:true}).selectOption('clipboard');
  await expect(page.locator('.bean-mascot')).toHaveAttribute('alt','Clipboard mascot holding a pencil');
  await expect(page.locator('.bean-icon')).toHaveAttribute('src',await page.locator('.bean-mascot').getAttribute('src'));
  await expect.poll(()=>page.locator('.bean-mascot').evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  const shared=page.url();
  await page.reload();
  await expect(page.getByLabel('Color palette')).toHaveValue('studio');
  await expect(page.getByLabel('Wordmark font',{exact:true})).toHaveValue('bricolage');
  await expect(page.getByLabel('Interface font')).toHaveValue('space');
  await expect(page.getByRole('button',{name:'Switch to light'})).toBeVisible();
  await expect(page.getByLabel('Mascot',{exact:true})).toHaveValue('clipboard');
  await expect(page.locator('.bean-mascot')).toHaveAttribute('alt','Clipboard mascot holding a pencil');
  await page.getByLabel('Mascot',{exact:true}).selectOption('bean');
  await expect(page.locator('.bean-mascot')).toHaveAttribute('alt','Coffee bean mascot holding a clipboard');
  await page.getByText('Try a font file',{exact:true}).click();
  await page.getByLabel('Local font file').setInputFiles('src/lib/design-system/fonts/fraunces.ttf');
  await expect(page.getByLabel('Wordmark font',{exact:true})).toHaveValue('local');
  await expect(page.getByRole('status')).toContainText('not uploaded');
  await page.getByLabel('Local font file').setInputFiles({name:'invalid.ttf',mimeType:'font/ttf',buffer:Buffer.from('not a font')});
  await expect(page.getByRole('status')).toContainText('could not be loaded');
  await page.reload();
  await expect(page.getByLabel('Wordmark font',{exact:true})).toHaveValue('system');
  await page.goto(base+'?palette=__proto__&display=invalid&body=invalid&mark=invalid&radius=bad');
  await expect(page.getByLabel('Color palette')).toHaveValue('service');
  await expect(page.getByLabel('Wordmark font',{exact:true})).toHaveValue('bricolage');
  for(const width of [390,768]) {
    await page.setViewportSize({width,height:900});
    await page.goto(shared);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await preview.getByRole('button',{name:'Catalog',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`artifacts/appearance/catalog-${width}.png`,fullPage:true});
    await page.keyboard.press('Escape');
    await page.screenshot({path:`artifacts/appearance/lab-${width}.png`,fullPage:true});
  }
  await page.goto(base+'ledger/');
  await expect(page.getByRole('heading',{name:'Same work. Different character.'})).toBeVisible();
  expect(requests.every(url=>new URL(url).hostname==='127.0.0.1')).toBe(true);
  expect(requests.some(url=>url.includes('/api/'))).toBe(false);
  expect(errors).toEqual([]);
  console.log('PASS: presets, independent controls, retained sample state, share URLs, local fonts, invalid inputs, dialogs/Escape/focus, mobile/tablet, dark mode, old links, no external or API requests.');
} finally { await browser?.close(); server.kill(); }
