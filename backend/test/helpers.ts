import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import sharp from 'sharp';

export async function login(
  app: INestApplication,
  destination: string,
  locale: 'ru' | 'ky' = 'ru',
) {
  const start = await request(app.getHttpServer())
    .post('/v1/auth/start')
    .send({ channel: 'phone', destination })
    .expect(200);
  expect(start.body.devCode).toMatch(/^\d{6}$/);
  const verify = await request(app.getHttpServer())
    .post('/v1/auth/verify')
    .send({
      challengeId: start.body.challengeId,
      code: start.body.devCode,
      platform: 'android',
      locale,
    })
    .expect(200);
  return {
    token: verify.body.accessToken as string,
    refreshToken: verify.body.refreshToken as string,
    userId: verify.body.userId as string,
  };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function categories(app: INestApplication) {
  const res = await request(app.getHttpServer()).get('/v1/categories').expect(200);
  return res.body as { id: string; slug: string; sensitive: boolean; publicationPolicy: string }[];
}

export async function locations(app: INestApplication) {
  const res = await request(app.getHttpServer()).get('/v1/locations').expect(200);
  return res.body as { id: string; kind: string; nameRu: string; parentId: string | null }[];
}

/** A small solid-colour PNG with EXIF-like noise is enough for the pipeline. */
export async function samplePng(color = { r: 20, g: 20, b: 20 }, size = 64): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 3, background: color } })
    .png()
    .toBuffer();
}

export async function uploadImage(
  app: INestApplication,
  token: string,
  buf: Buffer,
  categorySlug?: string,
) {
  const session = await request(app.getHttpServer())
    .post('/v1/media/upload-session')
    .set(auth(token))
    .expect(201);
  const q = categorySlug ? `?categorySlug=${categorySlug}` : '';
  const up = await request(app.getHttpServer())
    .post(`/v1/media/${session.body.mediaId}/upload${q}`)
    .set(auth(token))
    .attach('file', buf, 'photo.png')
    .expect(201);
  return up.body as {
    id: string;
    status: string;
    publicUrl: string | null;
    thumbUrl: string | null;
  };
}
