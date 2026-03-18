/**
 * Drizzle ORM instance — wraps the existing pg Pool.
 * Both Drizzle queries and raw pool queries share the same connection pool.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { getPool } from './pool';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  _db = drizzle(getPool(), { schema });
  return _db;
}

// Re-export schema for convenience
export { schema };
