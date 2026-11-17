/* Writes docs/openapi.json from the compiled app. Usage: npm run openapi:export (runs nest build first). */
require('reflect-metadata');
const fs = require('node:fs');
const path = require('node:path');

process.env.PGLITE_DIR = process.env.PGLITE_DIR || 'memory';
process.env.DISABLE_SCHEDULER = 'true';

async function main() {
  const { createApp, buildOpenApi } = require('../dist/app.factory');
  const app = await createApp({ logger: false });
  await app.init();
  const doc = buildOpenApi(app);
  const out = path.resolve(__dirname, '..', '..', 'docs', 'openapi.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(doc, null, 2));
  await app.close();
  console.log(`OpenAPI written to ${out} (${Object.keys(doc.paths).length} paths)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
