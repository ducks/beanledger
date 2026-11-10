import { test, expect } from './fixtures';
import { Client } from 'pg';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const execFileAsync = promisify(execFile);
const adminUrl = 'postgresql://beanledger:beanledger@127.0.0.1:5433/beanledger_test';

async function scratch() {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  const name = `migration_test_${randomBytes(6).toString('hex')}`;
  await admin.query(`CREATE DATABASE "${name}"`);
  const url = `postgresql://beanledger:beanledger@127.0.0.1:5433/${name}`;
  const client = new Client({ connectionString: url });
  await client.connect();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beanledger-migrations-'));
  fs.cpSync(path.resolve('scripts'), path.join(dir, 'scripts'), { recursive: true });
  fs.symlinkSync(path.resolve('node_modules'), path.join(dir, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  fs.mkdirSync(path.join(dir, 'migrations'));
  return {
    client,
    migration: (sql: string) => fs.writeFileSync(path.join(dir, 'migrations/001_test.sql'), sql),
    run: () => execFileAsync(process.execPath, [path.join(dir, 'scripts/migrate.js')], {
      env: { ...process.env, DATABASE_URL: url }, timeout: 15000
    }),
    cleanup: async () => {
      await client.end();
      await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      await admin.end();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

test('a failure recording a migration rolls back its schema changes', async () => {
  const db = await scratch();
  try {
    await db.client.query("CREATE TABLE schema_migrations (version text PRIMARY KEY CHECK (version <> '001_test'), applied_at timestamp DEFAULT CURRENT_TIMESTAMP)");
    db.migration('CREATE TABLE migration_marker (id integer);');
    await expect(db.run()).rejects.toThrow();
    const table = await db.client.query("SELECT to_regclass('public.migration_marker') AS name");
    expect(table.rows[0].name).toBeNull();
    expect((await db.client.query('SELECT version FROM schema_migrations')).rows).toEqual([]);
  } finally {
    await db.cleanup();
  }
});

test('concurrent migration runners serialize before reading migration history', async () => {
  const db = await scratch();
  try {
    db.migration('CREATE TABLE migration_marker (id integer); SELECT pg_sleep(1);');
    const runs = await Promise.allSettled([db.run(), db.run()]);
    expect(runs.map((run) => run.status)).toEqual(['fulfilled', 'fulfilled']);
    expect((await db.client.query('SELECT version FROM schema_migrations')).rows).toEqual([{ version: '001_test' }]);
    expect((await db.client.query("SELECT to_regclass('public.migration_marker') AS name")).rows[0].name).toBe('migration_marker');
  } finally {
    await db.cleanup();
  }
});

test('a terminated migration session rolls back and releases its lock', async () => {
  const db = await scratch();
  try {
    db.migration('CREATE TABLE migration_marker (id integer); SELECT pg_terminate_backend(pg_backend_pid());');
    await expect(db.run()).rejects.toThrow();
    expect((await db.client.query("SELECT to_regclass('public.migration_marker') AS name")).rows[0].name).toBeNull();
    expect((await db.client.query('SELECT version FROM schema_migrations')).rows).toEqual([]);
    db.migration('CREATE TABLE migration_marker (id integer);');
    await db.run();
    expect((await db.client.query('SELECT version FROM schema_migrations')).rows).toEqual([{ version: '001_test' }]);
  } finally {
    await db.cleanup();
  }
});
