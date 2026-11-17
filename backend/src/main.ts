import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp, mountDocs } from './app.factory';
import { APP_CONFIG, type AppConfig } from './config/app-config';
import { DB, type AppDb } from './database/database.module';
import { bootstrapFirstAdmin } from './modules/admin/admin-bootstrap';

async function bootstrap() {
  const app = await createApp();
  const cfg = app.get<AppConfig>(APP_CONFIG);
  await bootstrapFirstAdmin(app.get<AppDb>(DB));
  if (cfg.nodeEnv !== 'production' || process.env.ENABLE_DOCS === 'true') mountDocs(app);
  await app.listen(
    cfg.port,
    process.env.HOST || (cfg.nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1'),
  );
  new Logger('Bootstrap').log(`Tabyldy backend listening on ${cfg.publicBaseUrl} (${cfg.nodeEnv})`);
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
