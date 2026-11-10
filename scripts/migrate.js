#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://beanledger:beanledger@localhost:5432/beanledger'
});

async function runMigrations() {
  console.log('Checking for pending migrations...');

  // A session-level lock covers the history read and every migration, including
  // creation of the history table. PostgreSQL releases it if the session dies.
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1, $2)', [1112293700, 1]);
    locked = true;

    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of applied migrations
    const appliedResult = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const applied = new Set(appliedResult.rows.map(r => r.version));

    // Get migration files from disk
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let ranCount = 0;

    for (const file of files) {
      const version = file.replace('.sql', '');

      if (applied.has(version)) {
        continue; // Already applied
      }

      console.log(`Running migration: ${version}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      try {
        // Changes and the history entry must commit together.
        await client.query('BEGIN');
        await client.query(sql);

        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await client.query('COMMIT');

        console.log(`✓ Applied migration: ${version}`);
        ranCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to apply migration ${version}:`, err);
        throw err; // Stop on first failure
      }
    }

    if (ranCount === 0) {
      console.log('No pending migrations');
    } else {
      console.log(`Applied ${ranCount} migration(s)`);
    }
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock($1, $2)', [1112293700, 1]);
    } finally {
      client.release();
    }
  }
}

try {
  await runMigrations();
  console.log('Migrations completed successfully');
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
