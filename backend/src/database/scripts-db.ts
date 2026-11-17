/* DB bootstrap used by CLI scripts (seed, create-admin) without starting Nest. */
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as schema from './schema';
import type { AppDb } from './database.module';
import type { AppConfig } from '../config/app-config';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '..', '..', 'drizzle');

export async function createDbForScripts(
  cfg: AppConfig,
): Promise<{ db: AppDb; close: () => Promise<void> }> {
  if (cfg.database.url) {
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const pool = new Pool({ connectionString: cfg.database.url });
    const db = drizzle({ client: pool, schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return { db: db as unknown as AppDb, close: () => pool.end() };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dir = path.resolve(cfg.database.pgliteDir);
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir, { extensions: { pg_trgm } });
  await client.waitReady;
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db: db as unknown as AppDb, close: () => client.close() };
}
