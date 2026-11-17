import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as schema from './schema';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { seedReferenceData } from './seed';

export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;
export const DB = Symbol('DB');

const MIGRATIONS_FOLDER = path.resolve(__dirname, '..', '..', 'drizzle');

interface DbHandle {
  db: AppDb;
  close: () => Promise<void>;
  kind: 'pglite' | 'postgres';
}

async function createPglite(dir: string): Promise<DbHandle> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dataDir = dir === 'memory' ? undefined : path.resolve(dir);
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  const client = dataDir
    ? new PGlite(dataDir, { extensions: { pg_trgm } })
    : new PGlite({ extensions: { pg_trgm } });
  await client.waitReady;
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db: db as unknown as AppDb, close: () => client.close(), kind: 'pglite' };
}

async function createPostgres(url: string): Promise<DbHandle> {
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzle({ client: pool, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db: db as unknown as AppDb, close: () => pool.end(), kind: 'postgres' };
}

@Injectable()
export class DatabaseLifecycle implements OnModuleDestroy {
  constructor(@Inject('DB_HANDLE') private readonly handle: DbHandle) {}
  async onModuleDestroy() {
    await this.handle.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: 'DB_HANDLE',
      inject: [APP_CONFIG],
      useFactory: async (cfg: AppConfig): Promise<DbHandle> => {
        const logger = new Logger('Database');
        const handle = cfg.database.url
          ? await createPostgres(cfg.database.url)
          : await createPglite(cfg.database.pgliteDir);
        logger.log(
          handle.kind === 'postgres'
            ? 'Connected to PostgreSQL and applied migrations'
            : `Using embedded PGlite (${cfg.database.pgliteDir}); set DATABASE_URL for a real PostgreSQL`,
        );
        await seedReferenceData(handle.db);
        return handle;
      },
    },
    { provide: DB, inject: ['DB_HANDLE'], useFactory: (h: DbHandle) => h.db },
    DatabaseLifecycle,
  ],
  exports: [DB],
})
export class DatabaseModule {}
