import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'node:fs';
import { createApp } from '../src/app.factory';
import { auth, categories, samplePng, uploadImage } from './helpers';

/**
 * Default hosting setup: photos kept in PostgreSQL (STORAGE_DRIVER=db) and listings
 * with photos the AI could not check go live at once, with a review case for
 * moderators (PHOTO_REVIEW=after).
 */
describe('Listings with unchecked photos (post-moderation, db storage)', () => {
  let app: INestApplication;
  let token: string;
  let cats: Awaited<ReturnType<typeof categories>>;

  beforeAll(async () => {
    process.env.PHOTO_REVIEW = 'after';
    process.env.STORAGE_DRIVER = 'db';
    app = await createApp({ logger: false });
    await app.init();
    cats = await categories(app);
    const guest = await request(app.getHttpServer())
      .post('/v1/auth/guest')
      .send({ platform: 'web' })
      .expect(201);
    token = guest.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync('./storage-test', { recursive: true, force: true });
  });

  it('a guest posts a found item with a photo: it is in the public feed with its photo', async () => {
    const wallets = cats.find((c) => c.slug === 'wallets')!;
    const media = await uploadImage(app, token, await samplePng(), 'wallets');
    expect(media.status).toBe('READY_UNCHECKED');
    expect(fs.existsSync('./storage-test')).toBe(false); // bytes went to the database

    const created = await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(token))
      .send({
        listingType: 'FOUND',
        categoryId: wallets.id,
        title: 'Найден чёрный кошелёк',
        mediaIds: [media.id],
        acceptRules: true,
      })
      .expect(201);
    expect(created.body.item.status).toBe('PUBLISHED');

    const feed = await request(app.getHttpServer()).get('/v1/items?type=FOUND').expect(200);
    const card = feed.body.items.find((i: any) => i.id === created.body.item.id);
    expect(card).toBeTruthy();
    const photo = new URL(card.media[0].publicUrl);
    expect(photo.pathname).toContain('/v1/media/public/');
    const served = await request(app.getHttpServer()).get(photo.pathname).expect(200);
    expect(served.headers['content-type']).toBe('image/webp');

    // Reward filter must not widen the other filters: a rewarded LOST item stays out of FOUND.
    await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(token))
      .send({
        listingType: 'LOST',
        categoryId: wallets.id,
        title: 'Потерял кошелёк',
        reward: { note: 'Отблагодарю' },
        acceptRules: true,
      })
      .expect(201);
    const rewarded = await request(app.getHttpServer())
      .get('/v1/items?type=FOUND&withReward=true')
      .expect(200);
    expect(rewarded.body.items).toEqual([]);
  });
});
