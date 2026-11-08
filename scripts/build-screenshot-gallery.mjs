import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('artifacts/screenshot-gallery');
const target = path.resolve('artifacts/screenshot-site');
const screens = [
  ['01-login', 'Login'], ['02-signup', 'Sign up'], ['03-forgot-password', 'Forgot password'],
  ['04-reset-password', 'Set a new password'], ['05-verification-invalid-link', 'Email verification — invalid link'],
  ['05b-verification-success', 'Email verification — success'],
  ['06-invitation-invalid-link', 'Invitation — invalid link'], ['06b-invitation-valid', 'Invitation — create account'],
  ...[1, 2, 3, 4, 5].map(n => [`07-walkthrough-step-${n}`, `Getting started — step ${n}`]),
  ['08-dashboard-empty', 'Empty dashboard'], ['09-settings', 'Settings'], ['10-catalog-products', 'Catalog — products'],
  ['11-catalog-roast-groups', 'Catalog — roast groups'], ['12-catalog-aliases', 'Catalog — aliases'],
  ['13-catalog-csv-formats', 'Catalog — CSV formats'], ['14-custom-csv-format', 'Custom CSV format builder'],
  ['15-packaging', 'Packaging inventory'], ['16-new-product', 'New product'], ['17-dashboard-with-roast-day', 'Dashboard — roast day'],
  ['18-roast-planner', 'Roast planner'], ['19-pick-list', 'Pick list'], ['20-production-reports', 'Production reports'],
  ['21-add-manual-product', 'Add manual product']
];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
for (const [id] of screens) for (const size of ['desktop', 'mobile']) {
  const filename = `${id}-${size}.png`;
  if (!fs.existsSync(path.join(source, filename))) throw new Error(`Missing screenshot: ${filename}`);
}
// Rebuild the public artifact from an explicit whitelist: never publish the
// test outbox, traces, screenshots from failures, or other local files.
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
const cards = screens.map(([id, title]) => {
  for (const size of ['desktop', 'mobile']) fs.copyFileSync(path.join(source, `${id}-${size}.png`), path.join(target, `${id}-${size}.png`));
  return `<section><h2>${escape(title)}</h2><div class="shots">${['desktop', 'mobile'].map(size => `<figure><a href="${id}-${size}.png"><img loading="lazy" src="${id}-${size}.png" alt="${escape(title)} — ${size}"></a><figcaption>${size}</figcaption></figure>`).join('')}</div></section>`;
}).join('\n');
fs.writeFileSync(path.join(target, '.nojekyll'), '');
fs.writeFileSync(path.join(target, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BeanLedger screenshots</title><style>body{margin:0 auto;padding:2rem;max-width:1200px;background:#f7f5f0;color:#292827;font:16px/1.5 system-ui,sans-serif}h1{font-size:2rem;margin-bottom:.25rem}h2{font-size:1.2rem}p{max-width:70ch}section{padding:1rem 0;border-top:1px solid #d8d1c7}.shots{display:grid;grid-template-columns:3fr 1fr;gap:1rem;align-items:start}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #d8d1c7;border-radius:6px}figcaption{text-transform:capitalize;margin-top:.3rem;color:#625d56}a{color:inherit}@media(max-width:650px){body{padding:1rem}.shots{grid-template-columns:1fr}}</style></head><body><h1>BeanLedger screenshots</h1><p>Desktop and mobile views captured from a disposable test environment with fictional data. Select an image to view it at full size.</p>${cards}</body></html>`);
console.log(`Built ${screens.length} screens in ${target}`);
