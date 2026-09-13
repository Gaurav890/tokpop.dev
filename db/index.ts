import { drizzle } from 'drizzle-orm/node-postgres';
import { getDatabase } from './client';
import * as schema from './schema';

export function getDb() {
  return drizzle(getDatabase().driver(), { schema });
}
