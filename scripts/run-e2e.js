#!/usr/bin/env node
// Orchestrate the e2e suite:
//   1. start the test postgres
//   2. wait for it
//   3. run playwright (which boots its own dev server pointed at the test DB)
//   4. always tear the DB down, even on failure

import { spawn } from 'child_process';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
    child.on('error', reject);
  });
}

async function waitForDb() {
  // Wait until we can actually issue a query from the host. pg_isready
  // turns true before the entrypoint init scripts (schema.sql import)
  // finish, so we'd hit ECONNREFUSED if we trusted it.
  const { default: pg } = await import('pg');
  for (let i = 0; i < 120; i++) {
    const client = new pg.Client({
      connectionString:
        'postgresql://beanledger:beanledger@localhost:5433/beanledger_test'
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch {
      await client.end().catch(() => {});
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('test postgres did not become ready in 60s');
}

async function main() {
  await run('docker', ['compose', '-f', 'docker-compose.test.yml', 'up', '-d']);
  await waitForDb();

  const env = {
    ...process.env,
    DATABASE_URL: 'postgresql://beanledger:beanledger@localhost:5433/beanledger_test'
  };

  let exitCode = 0;
  try {
    await run('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], { env });
  } catch (err) {
    exitCode = 1;
  }

  await run('docker', ['compose', '-f', 'docker-compose.test.yml', 'down', '-v']);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
