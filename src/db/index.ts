import { drizzle } from 'drizzle-orm/neon-http';
import { dbRelations } from './relations';

// defineRelations()'s return value already carries the full table schema, so
// there's no separate `schema` option here (v1's drizzle() rejects passing
// both `schema` and `relations` together — confirmed via tsc, not assumed).
export const db = drizzle(process.env.DATABASE_URL!, { relations: dbRelations });
