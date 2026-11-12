import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Generate the TypeScript config required by shared application calculations.
execFileSync('pnpm', ['exec', 'svelte-kit', 'sync'], { stdio: 'inherit' });

const root = path.resolve('artifacts/design-preview-source');
const outDir = path.resolve('artifacts/design-preview');
const base = '/beanledger/design-system/';
fs.mkdirSync(root, { recursive: true });
for (const [source, target] of [
  ['src/routes/design-system/+page.svelte', 'Workshop.svelte'],
  ['src/routes/design-system/components/+page.svelte', 'Components.svelte'],
  ['src/routes/design-system/[concept]/+page.svelte', 'Concept.svelte']
]) {
  const code = fs.readFileSync(source, 'utf8')
    .replace("import type { PageData } from './$types';", '')
    .replace('data: PageData', 'data: { concept: string }')
    .replaceAll('href="/design-system', `href="${base.slice(0, -1)}`);
  fs.writeFileSync(path.join(root, target), code);
}
fs.writeFileSync(path.join(root, 'entry.js'), `
import { mount } from 'svelte';
import Workshop from './Workshop.svelte';
import Concept from './Concept.svelte';
import Components from './Components.svelte';
const concept = location.pathname.replace(/\\/index.html$/, '').replace(/\\/$/, '').split('/').pop();
mount(['studio', 'workbench', 'guided', 'ledger'].includes(concept) ? Concept : concept === 'components' ? Components : Workshop,
  { target: document.getElementById('app'), props: { data: { concept } } });
`);
const input = {};
for (const name of ['', 'studio', 'workbench', 'guided', 'ledger', 'components']) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'index.html');
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>BeanLedger design explorations</title><style>body{margin:0}*{box-sizing:border-box}</style></head><body><div id="app"></div><script type="module" src="${name ? '../' : './'}entry.js"></script></body></html>`);
  input[name || 'index'] = file;
}
await build({ configFile: false, root, base,
  plugins: [svelte({ configFile: false })],
  resolve: { alias: { $lib: path.resolve('src/lib') } },
  build: { outDir, emptyOutDir: true, rollupOptions: { input } }
});
