import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
execFileSync('pnpm', ['exec', 'svelte-kit', 'sync'], { stdio: 'inherit' });
const root = path.resolve('artifacts/design-preview-source');
const outDir = path.resolve('artifacts/design-preview');
const base = '/beanledger/design-system/';
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, 'entry.js'), `
import { mount } from 'svelte';
import AppearanceLab from '${path.resolve('src/lib/design-system/AppearanceLab.svelte')}';
mount(AppearanceLab, { target: document.getElementById('app') });
`);
fs.writeFileSync(path.join(root, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BeanLedger appearance lab</title><style>body{margin:0}</style></head><body><div id="app"></div><script type="module" src="./entry.js"></script></body></html>`);
await build({ configFile: false, root, base,
  plugins: [svelte({ configFile: false })],
  resolve: { alias: { $lib: path.resolve('src/lib') } },
  build: { outDir, emptyOutDir: true }
});
// Old shared links land in the appearance lab rather than showing alternate flows.
for (const slug of ['studio','workbench','guided','ledger','components','packaging']) {
  fs.mkdirSync(path.join(outDir, slug), { recursive: true });
  fs.writeFileSync(path.join(outDir, slug, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=${base}"><title>BeanLedger appearance lab</title></head><body><a href="${base}">Open the appearance lab</a></body></html>`);
}
