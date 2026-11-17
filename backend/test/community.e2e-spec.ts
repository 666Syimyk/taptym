import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/app.factory';
import { auth, categories } from './helpers';

/** Comments under listings, feedback to the team, and the English language. */
describe('Comments, feedback and English', () => {
  let app: INestApplication;
  let owner: string;
  let visitor: string;
  let itemId: string;

  const guest = async () =>
    (await request(app.getHttpServer()).post('/v1/auth/guest').send({ platform: 'web' }).expect(201))
      .body.accessToken as string;

  beforeAll(async () => {
    app = await createApp({ logger: false });
    await app.init();
    owner = await guest();
    visitor = await guest();
    const wallets = (await categories(app)).find((c) => c.slug === 'wallets')!;
    const created = await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(owner))
      .send({ listingType: 'LOST', categoryId: wallets.id, title: 'Потерял кошелёк', acceptRules: true })
      .expect(201);
    itemId = created.body.item.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('anyone reads comments, signed-in people write them, the owner is notified', async () => {
    const http = app.getHttpServer();
    await request(http)
      .post(`/v1/items/${itemId}/comments`)
      .send({ body: 'Видел такой у остановки' })
      .expect(401);
    const posted = await request(http)
      .post(`/v1/items/${itemId}/comments`)
      .set(auth(visitor))
      .send({ body: 'Видел такой у остановки' })
      .expect(201);
    expect(posted.body).toMatchObject({ isMine: true, byItemOwner: false, canDelete: true });

    // Contacts and money requests are blocked, as in listings.
    await request(http)
      .post(`/v1/items/${itemId}/comments`)
      .set(auth(visitor))
      .send({ body: 'Звоните 0700 123 456' })
      .expect(400);
    await request(http)
      .post(`/v1/items/${itemId}/comments`)
      .set(auth(visitor))
      .send({ body: 'Верну за 1000 сом' })
      .expect(400);

    const list = await request(http).get(`/v1/items/${itemId}/comments`).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ body: 'Видел такой у остановки', canDelete: false });

    const notes = await request(http).get('/v1/notifications').set(auth(owner)).expect(200);
    expect(JSON.stringify(notes.body)).toContain('Потерял кошелёк');

    // The listing owner may delete comments under it; strangers may not.
    const third = await guest();
    await request(http).delete(`/v1/comments/${posted.body.id}`).set(auth(third)).expect(403);
    await request(http).delete(`/v1/comments/${posted.body.id}`).set(auth(owner)).expect(204);
    expect((await request(http).get(`/v1/items/${itemId}/comments`).expect(200)).body).toEqual([]);
  });

  it('comments can be reported', async () => {
    const http = app.getHttpServer();
    const posted = await request(http)
      .post(`/v1/items/${itemId}/comments`)
      .set(auth(visitor))
      .send({ body: 'Странный комментарий' })
      .expect(201);
    await request(http)
      .post('/v1/reports')
      .set(auth(owner))
      .send({ targetType: 'comment', targetId: posted.body.id, reason: 'spam' })
      .expect(201);
  });

  it('feedback reaches the team from guests and signed-in people', async () => {
    const http = app.getHttpServer();
    await request(http)
      .post('/v1/feedback')
      .send({ kind: 'idea', message: 'Добавьте английский язык', rating: 5 })
      .expect(201);
    await request(http)
      .post('/v1/feedback')
      .set(auth(visitor))
      .send({ kind: 'problem', message: 'Не грузится фото', contact: '@aida' })
      .expect(201);
    await request(http).post('/v1/feedback').send({ kind: 'spam', message: 'xx' }).expect(400);
  });

  it('speaks English: reference data and errors', async () => {
    const http = app.getHttpServer();
    const cats = await request(http).get('/v1/categories').expect(200);
    expect(cats.body.find((c: any) => c.slug === 'wallets').nameEn).toBe('Wallets');
    const locs = await request(http).get('/v1/locations').expect(200);
    expect(locs.body.find((l: any) => l.nameRu === 'Бишкек').nameEn).toBe('Bishkek');
    const err = await request(http)
      .get('/v1/me')
      .set('Accept-Language', 'en')
      .expect(401);
    expect(err.body.message).toBe('Please confirm your contact to continue.');
  });
});
