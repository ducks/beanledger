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

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const db = getDb();
  return db.query<T>(text, params);
}

export async function withTransaction<T>(
  operation: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
