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

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

async function runMigrations() {
  console.log('Checking for pending migrations...');

  // Ensure migrations tracking table exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of applied migrations
  const appliedResult = await query(
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
      // Run the migration
      await query(sql);

      // Record it as applied
      await query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      );

      console.log(`✓ Applied migration: ${version}`);
      ranCount++;
    } catch (err) {
      console.error(`✗ Failed to apply migration ${version}:`, err);
      throw err; // Stop on first failure
    }
  }

  if (ranCount === 0) {
    console.log('No pending migrations');
  } else {
    console.log(`Applied ${ranCount} migration(s)`);
  }
}

runMigrations()
  .then(() => {
    console.log('Migrations completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
