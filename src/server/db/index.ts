// Neon + Drizzle connection module.
// Used by both server routes (with process.env.DATABASE_URL at runtime) and
// scripts like seed.ts (which load .env.local explicitly before calling createDb).

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function createDb(databaseUrl?: string) {
  const url = databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;
