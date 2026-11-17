import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

/**
 * Typed application configuration built from environment variables.
 * Every secret has a dev-only default so the project starts locally; production
 * refuses to boot with dev defaults (see assertProductionSafety).
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  publicBaseUrl: string;
  corsOrigins: string[];
  database: { url: string | null; pgliteDir: string };
  redisUrl: string | null;
  auth: {
    accessSecret: string;
    accessTtlSeconds: number;
    refreshTtlDays: number;
    otpTtlSeconds: number;
    otpHmacSecret: string;
    otpDelivery: 'console' | 'webhook';
    otpWebhookUrl: string | null;
    otpWebhookToken: string | null;
    otpDevEcho: boolean;
  };
  admin: { jwtSecret: string; sessionTtlSeconds: number; requireMfa: boolean };
  storage: {
    driver: 'local' | 's3' | 'db';
    localDir: string;
    s3: {
      endpoint: string | null;
      region: string | null;
      bucketPublic: string | null;
      bucketProtected: string | null;
      accessKeyId: string | null;
      secretAccessKey: string | null;
    };
    maxBytes: number;
  };
  ai: {
    /** Resolved: "auto" becomes anthropic when a key is set, otherwise local. */
    provider: 'disabled' | 'anthropic' | 'local';
    anthropicApiKey: string | null;
    model: string;
    timeoutMs: number;
    /** Folder with the on-device recognition model (downloaded once). */
    localModelDir: string;
    localModelDownload: boolean;
    /** Mirror for networks where the default model host is blocked. */
    localModelUrl: string | null;
  };
  /**
   * Photos the AI could not check: 'after' publishes the listing at once and leaves a
   * review case for moderators; 'before' holds it until a moderator approves it.
   */
  photoReview: 'before' | 'after';
  push: { driver: 'console' | 'fcm' };
  matching: { timeWindowDays: number; minScore: number };
}

const DEV_DEFAULTS = {
  access: 'change-me-dev-only-access-secret-change-me',
  otp: 'change-me-dev-only-otp-secret-change-me',
  admin: 'change-me-dev-only-admin-secret-change-me',
};

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}
function opt(name: string): string | null {
  const v = process.env[name];
  return v === undefined || v === '' ? null : v;
}
function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} must be a number`);
  return n;
}
function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export function loadConfig(): AppConfig {
  if (process.env.NODE_ENV !== 'test' && existsSync('.env')) loadEnvFile('.env');
  const nodeEnv = (str('NODE_ENV', 'development') as AppConfig['nodeEnv']) || 'development';
  const cfg: AppConfig = {
    nodeEnv,
    port: num('PORT', 3001),
    // Render (and similar hosts) publish the service URL as RENDER_EXTERNAL_URL.
    publicBaseUrl: str('PUBLIC_BASE_URL', str('RENDER_EXTERNAL_URL', 'http://localhost:3001')),
    corsOrigins: str('CORS_ORIGINS', 'http://localhost:5173,http://localhost:8080')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    database: { url: opt('DATABASE_URL'), pgliteDir: str('PGLITE_DIR', './data/pglite') },
    redisUrl: opt('REDIS_URL'),
    auth: {
      accessSecret: str('JWT_ACCESS_SECRET', DEV_DEFAULTS.access),
      accessTtlSeconds: num('JWT_ACCESS_TTL_SECONDS', 900),
      refreshTtlDays: num('REFRESH_TTL_DAYS', 30),
      otpTtlSeconds: num('OTP_TTL_SECONDS', 300),
      otpHmacSecret: str('OTP_HMAC_SECRET', DEV_DEFAULTS.otp),
      otpDelivery: str('OTP_DELIVERY', 'console') as AppConfig['auth']['otpDelivery'],
      otpWebhookUrl: opt('OTP_WEBHOOK_URL'),
      otpWebhookToken: opt('OTP_WEBHOOK_TOKEN'),
      otpDevEcho: nodeEnv !== 'production' && bool('OTP_DEV_ECHO', true),
    },
    admin: {
      jwtSecret: str('ADMIN_JWT_SECRET', DEV_DEFAULTS.admin),
      sessionTtlSeconds: num('ADMIN_SESSION_TTL_SECONDS', 3600),
      requireMfa: bool('ADMIN_REQUIRE_MFA', nodeEnv === 'production'),
    },
    storage: {
      driver: str('STORAGE_DRIVER', 'local') as 'local' | 's3' | 'db',
      localDir: str('STORAGE_LOCAL_DIR', './storage'),
      s3: {
        endpoint: opt('S3_ENDPOINT'),
        region: opt('S3_REGION'),
        bucketPublic: opt('S3_BUCKET_PUBLIC'),
        bucketProtected: opt('S3_BUCKET_PROTECTED'),
        accessKeyId: opt('S3_ACCESS_KEY_ID'),
        secretAccessKey: opt('S3_SECRET_ACCESS_KEY'),
      },
      maxBytes: num('MEDIA_MAX_BYTES', 10 * 1024 * 1024),
    },
    ai: {
      provider: str('AI_PROVIDER', 'auto') as AppConfig['ai']['provider'],
      anthropicApiKey: opt('ANTHROPIC_API_KEY'),
      model: str('AI_MODEL', 'claude-opus-5-5'),
      timeoutMs: num('AI_TIMEOUT_MS', 30000),
      localModelDir: str('AI_LOCAL_MODEL_DIR', './models'),
      localModelDownload: bool('AI_LOCAL_MODEL_DOWNLOAD', nodeEnv !== 'test'),
      localModelUrl: opt('AI_LOCAL_MODEL_URL'),
    },
    photoReview: str('PHOTO_REVIEW', 'after') as AppConfig['photoReview'],
    push: { driver: str('PUSH_DRIVER', 'console') as 'console' | 'fcm' },
    matching: {
      timeWindowDays: num('MATCH_TIME_WINDOW_DAYS', 14),
      minScore: num('MATCH_MIN_SCORE', 35),
    },
  };
  if (!['development', 'test', 'production'].includes(cfg.nodeEnv))
    throw new Error('Invalid NODE_ENV');
  if (!['console', 'webhook'].includes(cfg.auth.otpDelivery))
    throw new Error('OTP_DELIVERY must be console or webhook');
  if (cfg.auth.otpDelivery === 'webhook') {
    if (!cfg.auth.otpWebhookUrl || !cfg.auth.otpWebhookToken)
      throw new Error('OTP webhook requires OTP_WEBHOOK_URL and OTP_WEBHOOK_TOKEN');
    const url = new URL(cfg.auth.otpWebhookUrl);
    if (
      url.protocol !== 'https:' &&
      !(cfg.nodeEnv !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname))
    )
      throw new Error('OTP_WEBHOOK_URL must use HTTPS');
  }
  if (!['local', 's3', 'db'].includes(cfg.storage.driver)) throw new Error('Invalid STORAGE_DRIVER');
  if (!['before', 'after'].includes(cfg.photoReview))
    throw new Error('PHOTO_REVIEW must be before or after');
  const requested = cfg.ai.provider as string;
  if (!['auto', 'disabled', 'anthropic', 'local'].includes(requested))
    throw new Error('AI_PROVIDER must be auto, local, anthropic or disabled');
  if (requested === 'anthropic' && !cfg.ai.anthropicApiKey)
    throw new Error('AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY');
  if (requested === 'auto') cfg.ai.provider = cfg.ai.anthropicApiKey ? 'anthropic' : 'local';
  if (cfg.ai.localModelUrl && !cfg.ai.localModelUrl.startsWith('https://'))
    throw new Error('AI_LOCAL_MODEL_URL must use HTTPS');
  if (cfg.push.driver !== 'console')
    throw new Error(
      'Only PUSH_DRIVER=console is implemented; in-app notifications remain available',
    );
  for (const [name, value] of Object.entries({
    port: cfg.port,
    accessTtl: cfg.auth.accessTtlSeconds,
    refreshDays: cfg.auth.refreshTtlDays,
    otpTtl: cfg.auth.otpTtlSeconds,
    adminTtl: cfg.admin.sessionTtlSeconds,
    mediaMaxBytes: cfg.storage.maxBytes,
    aiTimeout: cfg.ai.timeoutMs,
  })) {
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new Error(`Invalid positive integer for ${name}`);
  }
  assertProductionSafety(cfg);
  return cfg;
}

export function assertProductionSafety(cfg: AppConfig): void {
  if (cfg.nodeEnv !== 'production') return;
  const problems: string[] = [];
  if (cfg.auth.accessSecret === DEV_DEFAULTS.access)
    problems.push('JWT_ACCESS_SECRET uses the dev default');
  if (cfg.auth.otpHmacSecret === DEV_DEFAULTS.otp)
    problems.push('OTP_HMAC_SECRET uses the dev default');
  if (cfg.admin.jwtSecret === DEV_DEFAULTS.admin)
    problems.push('ADMIN_JWT_SECRET uses the dev default');
  if (
    [cfg.auth.accessSecret, cfg.auth.otpHmacSecret, cfg.admin.jwtSecret].some((s) => s.length < 32)
  )
    problems.push('Production secrets must contain at least 32 characters');
  if (new Set([cfg.auth.accessSecret, cfg.auth.otpHmacSecret, cfg.admin.jwtSecret]).size !== 3)
    problems.push('Production secrets must be distinct');
  if (!cfg.admin.requireMfa) problems.push('ADMIN_REQUIRE_MFA must be true in production');
  if (!cfg.publicBaseUrl.startsWith('https://'))
    problems.push('PUBLIC_BASE_URL must use HTTPS in production');
  if (!cfg.database.url) problems.push('DATABASE_URL must point to PostgreSQL in production');
  // Without an SMS provider phone sign-in cannot work; a deployment may accept that
  // explicitly (guests still post and claim). Codes are never echoed in production.
  if (cfg.auth.otpDelivery === 'console' && !bool('OTP_CONSOLE_IN_PRODUCTION', false))
    problems.push('OTP_DELIVERY=console is not allowed in production');
  if (problems.length)
    throw new Error(`Unsafe production configuration:\n - ${problems.join('\n - ')}`);
}

export const APP_CONFIG = Symbol('APP_CONFIG');
