import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { and, eq } from 'drizzle-orm';
import type { AppConfig } from '../../config/app-config';
import type { AppDb } from '../../database/database.module';
import { mediaObjects } from '../../database/schema';

export type Bucket = 'public' | 'protected' | 'temp';

/**
 * Object storage abstraction (PRD §22.6). Keys are opaque; public objects are served
 * through the API (local driver) or a CDN (S3 driver). Protected objects are only
 * reachable through short-lived signed URLs issued by the media service.
 */
export interface StorageAdapter {
  put(bucket: Bucket, key: string, data: Buffer, contentType: string): Promise<void>;
  get(bucket: Bucket, key: string): Promise<Buffer | null>;
  delete(bucket: Bucket, key: string): Promise<void>;
  /** Returns a URL the client can fetch a public object from. */
  publicUrl(key: string): string;
}

export const STORAGE = Symbol('STORAGE');

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger('Storage');
  constructor(
    private readonly root: string,
    private readonly publicBaseUrl: string,
  ) {}

  private resolve(bucket: Bucket, key: string) {
    const safe = key.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(path.resolve(this.root), bucket, safe);
  }

  async put(bucket: Bucket, key: string, data: Buffer): Promise<void> {
    const file = this.resolve(bucket, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }

  async get(bucket: Bucket, key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(bucket, key));
    } catch {
      return null;
    }
  }

  async delete(bucket: Bucket, key: string): Promise<void> {
    await fs.rm(this.resolve(bucket, key), { force: true });
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/v1/media/public/${encodeURIComponent(key)}`;
  }
}

/**
 * Keeps image bytes in PostgreSQL (table media_objects). For hosts without a
 * persistent disk, where local files vanish on every restart or redeploy.
 * Public objects are served through the API, exactly like the local driver.
 */
export class DbStorageAdapter implements StorageAdapter {
  constructor(
    private readonly db: AppDb,
    private readonly publicBaseUrl: string,
  ) {}

  async put(bucket: Bucket, key: string, data: Buffer, contentType: string): Promise<void> {
    await this.db
      .insert(mediaObjects)
      .values({ bucket, key, contentType, data })
      .onConflictDoUpdate({
        target: [mediaObjects.bucket, mediaObjects.key],
        set: { contentType, data, createdAt: new Date() },
      });
  }

  async get(bucket: Bucket, key: string): Promise<Buffer | null> {
    const [row] = await this.db
      .select({ data: mediaObjects.data })
      .from(mediaObjects)
      .where(and(eq(mediaObjects.bucket, bucket), eq(mediaObjects.key, key)));
    return row?.data ?? null;
  }

  async delete(bucket: Bucket, key: string): Promise<void> {
    await this.db
      .delete(mediaObjects)
      .where(and(eq(mediaObjects.bucket, bucket), eq(mediaObjects.key, key)));
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl}/v1/media/public/${encodeURIComponent(key)}`;
  }
}

/** S3-compatible adapter (AWS S3, MinIO, Cloudflare R2…). */
export class S3StorageAdapter implements StorageAdapter {
  private client: import('@aws-sdk/client-s3').S3Client | null = null;
  constructor(private readonly cfg: AppConfig['storage']['s3']) {}

  private async s3() {
    if (!this.client) {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.client = new S3Client({
        region: this.cfg.region ?? 'auto',
        endpoint: this.cfg.endpoint ?? undefined,
        forcePathStyle: Boolean(this.cfg.endpoint),
        credentials:
          this.cfg.accessKeyId && this.cfg.secretAccessKey
            ? { accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey }
            : undefined,
      });
    }
    return this.client;
  }

  private bucketName(bucket: Bucket) {
    if (bucket === 'public') return this.cfg.bucketPublic!;
    return this.cfg.bucketProtected!;
  }
  private keyFor(bucket: Bucket, key: string) {
    return bucket === 'temp' ? `temp/${key}` : key;
  }

  async put(bucket: Bucket, key: string, data: Buffer, contentType: string): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await (
      await this.s3()
    ).send(
      new PutObjectCommand({
        Bucket: this.bucketName(bucket),
        Key: this.keyFor(bucket, key),
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async get(bucket: Bucket, key: string): Promise<Buffer | null> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    try {
      const res = await (
        await this.s3()
      ).send(
        new GetObjectCommand({ Bucket: this.bucketName(bucket), Key: this.keyFor(bucket, key) }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      return null;
    }
  }

  async delete(bucket: Bucket, key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await (
      await this.s3()
    ).send(
      new DeleteObjectCommand({ Bucket: this.bucketName(bucket), Key: this.keyFor(bucket, key) }),
    );
  }

  publicUrl(key: string): string {
    const base = this.cfg.endpoint
      ? `${this.cfg.endpoint.replace(/\/$/, '')}/${this.cfg.bucketPublic}`
      : `https://${this.cfg.bucketPublic}.s3.${this.cfg.region}.amazonaws.com`;
    return `${base}/${key}`;
  }
}
