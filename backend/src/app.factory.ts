import { INestApplication, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/errors';
import { APP_CONFIG, type AppConfig } from './config/app-config';

/** Builds a fully configured app. Shared by main.ts, e2e tests and the OpenAPI exporter. */
export async function createApp(opts: { logger?: boolean } = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: opts.logger === false ? false : ['log', 'warn', 'error'],
    bodyParser: true,
    abortOnError: false,
  });
  const cfg = app.get<AppConfig>(APP_CONFIG);

  app.set('trust proxy', 1);
  // WEB_DIR: the built web app, served from the same address as the API. Registered
  // before helmet so the API's strict CSP does not block the app's own scripts.
  // ADMIN_DIR: the built team panel, served at /admin on the same address.
  const adminDir = process.env.ADMIN_DIR ? resolve(process.env.ADMIN_DIR) : null;
  if (adminDir && existsSync(join(adminDir, 'index.html'))) {
    app.useStaticAssets(adminDir, { prefix: '/admin', index: 'index.html', setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') });
  }
  const webDir = process.env.WEB_DIR ? resolve(process.env.WEB_DIR) : null;
  if (webDir && existsSync(join(webDir, 'index.html'))) {
    app.useStaticAssets(webDir, { index: 'index.html', maxAge: 0, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') });
  }
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use((req: any, res: any, next: () => void) => {
    const id =
      typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id'].slice(0, 64)
        : randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  });
  app.enableCors({ origin: cfg.corsOrigins, credentials: false, exposedHeaders: ['x-request-id'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableShutdownHooks();
  return app;
}

export function buildOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Tabyldy API')
    .setDescription(
      'Lost & found platform — public mobile API and admin API. Errors are `{code, message, status, requestId}` with localized messages (Accept-Language: ru|ky).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function mountDocs(app: INestApplication) {
  SwaggerModule.setup('docs', app, buildOpenApi(app), {
    swaggerOptions: { persistAuthorization: true },
  });
  new Logger('Bootstrap').log('OpenAPI docs at /docs');
}
