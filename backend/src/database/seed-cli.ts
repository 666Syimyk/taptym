/* Standalone seeding entry point: `npm run db:seed` (also runs automatically on boot). */
import 'reflect-metadata';
import { loadConfig } from '../config/app-config';
import { createDbForScripts } from './scripts-db';
import { seedReferenceData } from './seed';

async function main() {
  const cfg = loadConfig();
  const handle = await createDbForScripts(cfg);
  await seedReferenceData(handle.db);
  await handle.close();
  console.log('Reference data seeded.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
