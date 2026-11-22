import { Pool } from 'pg';
import type { Query } from './store-pg';

export const databaseUrl = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
let pool: Pool | null = null;
export const pgQuery: Query = async (text, params) => {
  pool ??= new Pool({ connectionString: databaseUrl(), ssl: /localhost|127\.0\.0\.1/.test(databaseUrl()) ? undefined : { rejectUnauthorized: false }, max: 3 });
  return pool.query(text, params as unknown[]);
};
