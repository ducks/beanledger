import pg from 'pg';
import { env } from '$env/dynamic/private';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDb(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const db = getDb();
  return db.query(text, params);
}
