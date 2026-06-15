import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type DbType = NeonHttpDatabase<typeof schema>;

let _db: DbType | null = null;

function getDb(): DbType {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export const db = new Proxy({} as DbType, {
  get(_, prop) {
    return getDb()[prop as keyof DbType];
  },
});
