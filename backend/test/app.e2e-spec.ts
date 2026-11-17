import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import WebSocket from 'ws';
import { ThrottlerStorage } from '@nestjs/throttler';
import * as fs from 'node:fs';
import { createApp } from '../src/app.factory';
import { AdminService } from '../src/modules/admin/admin.service';
import { MediaService } from '../src/modules/media/media.service';
import { auth, categories, locations, login, samplePng, uploadImage } from './helpers';

/**
 * Critical scenarios from PRD §29.2, run against an in-memory PGlite database.
 */
describe('Tabyldy API (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let finder: { token: string; userId: string; refreshToken: string };
  let owner: { token: string; userId: string; refreshToken: string };
  let stranger: { token: string; userId: string; refreshToken: string };
  let cats: Awaited<ReturnType<typeof categories>>;
  let locs: Awaited<ReturnType<typeof locations>>;
  let foundItemId: string;
  let lostItemId: string;
  let claimId: string;
  let conversationId: string;

  beforeAll(async () => {
    app = await createApp({ logger: false });
    await app.listen(0);
    const addr = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${typeof addr === 'string' ? 3000 : addr.port}`;
    cats = await categories(app);
    locs = await locations(app);
    finder = await login(app, '+996700000001');
    owner = await login(app, '0700000002', 'ky');
    stranger = await login(
      app,
      'stranger@example.com'.replace('stranger@example.com', '+996700000003'),
    );
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync('./storage-test', { recursive: true, force: true });
  });

  const cat = (slug: string) => cats.find((c) => c.slug === slug)!;
  const district = () => locs.find((l) => l.kind === 'district')!;

  // ---- Test 1: guest ----
  it('guest can open the catalog without registration', async () => {
    const res = await request(app.getHttpServer()).get('/v1/items?type=FOUND').expect(200);
    expect(res.body).toEqual({ items: [], nextCursor: null });
    await request(app.getHttpServer()).get('/v1/me').expect(401);
  });

  it('auth: phone normalization dedupes accounts, wrong code counts attempts, refresh rotates', async () => {
    const again = await login(app, '+996 700 000 002');
    expect(again.userId).toBe(owner.userId);

    const start = await request(app.getHttpServer())
      .post('/v1/auth/start')
      .send({ channel: 'phone', destination: '+996700000009' })
      .expect(200);
    for (let i = 0; i < 5; i++) {
      const r = await request(app.getHttpServer())
        .post('/v1/auth/verify')
        .send({ challengeId: start.body.challengeId, code: '000000' });
      expect([400, 429]).toContain(r.status);
    }
    await request(app.getHttpServer())
      .post('/v1/auth/verify')
      .send({ challengeId: start.body.challengeId, code: start.body.devCode })
      .expect(429);

    const refreshed = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: stranger.refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: stranger.refreshToken })
      .expect(401);
    stranger = {
      ...stranger,
      token: refreshed.body.accessToken,
      refreshToken: refreshed.body.refreshToken,
    };
  });

  // ---- Test 2 + 4 + 5: publish a found item with a photo, AI unavailable → manual review; documents never public ----
  it('media pipeline: standard photo → READY_UNCHECKED (AI off), document photo → BLOCKED_SENSITIVE', async () => {
    const png = await samplePng();
    const media = await uploadImage(app, finder.token, png, 'wallets');
    expect(media.status).toBe('READY_UNCHECKED');
    expect(media.publicUrl).toContain('/v1/media/preview/');
    const served = await request(app.getHttpServer())
      .get(new URL(media.publicUrl!).pathname + new URL(media.publicUrl!).search)
      .expect(200);
    expect(served.headers['content-type']).toBe('image/webp');
    const privateUrl = new URL(media.publicUrl!);
    await request(app.getHttpServer()).get(privateUrl.pathname).expect(404);
    await request(app.getHttpServer())
      .get(`/v1/media/public/${privateUrl.pathname.split('/').pop()}`)
      .expect(404);
    await request(app.getHttpServer()).get(`${privateUrl.pathname}?exp=1&sig=invalid`).expect(404);

    const doc = await uploadImage(
      app,
      finder.token,
      await samplePng({ r: 200, g: 200, b: 200 }),
      'documents',
    );
    expect(doc.status).toBe('BLOCKED_SENSITIVE');
    expect(doc.publicUrl).toBeNull();

    await request(app.getHttpServer())
      .get(`/v1/media/${media.id}/status`)
      .set(auth(owner.token))
      .expect(403);
    const session = await request(app.getHttpServer())
      .post('/v1/media/upload-session')
      .set(auth(finder.token))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/v1/media/${session.body.mediaId}/upload`)
      .set(auth(finder.token))
      .attach('file', Buffer.from('not an image'), 'x.png')
      .expect(400);
  });

  it('AI works without any key: photo suggestions, typed-text hints, health status', async () => {
    const session = await request(app.getHttpServer())
      .post('/v1/media/upload-session')
      .set(auth(finder.token))
      .expect(201);
    const up = await request(app.getHttpServer())
      .post(`/v1/media/${session.body.mediaId}/upload?listingType=LOST`)
      .set(auth(finder.token))
      .attach('file', await samplePng({ r: 10, g: 10, b: 200 }, 80), 'photo.png')
      .expect(201);
    expect(up.body.suggestions).toMatchObject({ color: 'blue', source: 'local' });
    // Without a check that reads text and sees faces the photo still goes to review.
    expect(up.body.status).toBe('READY_UNCHECKED');

    const hints = await request(app.getHttpServer())
      .post('/v1/ai/text-hints')
      .send({ title: 'Потерял чёрный кошелёк', description: 'Samsung внутри' })
      .expect(200);
    expect(hints.body).toEqual({ categorySlug: 'wallets', color: 'black', brand: 'Samsung' });
    await request(app.getHttpServer())
      .post('/v1/ai/text-hints')
      .send({ title: 'x'.repeat(300) })
      .expect(400);

    const health = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(health.body).toMatchObject({ ai: 'local', aiRecognition: 'missing' });
  });

  it('found item with unchecked photo goes to PENDING_REVIEW; idempotent create; text-only item publishes', async () => {
    const png = await samplePng({ r: 10, g: 10, b: 200 }, 80);
    const media = await uploadImage(app, finder.token, png, 'wallets');
    const body = {
      listingType: 'FOUND',
      categoryId: cat('wallets').id,
      title: 'Найден чёрный кошелёк',
      description: 'Кожаный, с молнией',
      color: 'black',
      approximateLocationId: district().id,
      eventTimeStart: new Date().toISOString(),
      mediaIds: [media.id],
      hiddenFeatures: ['царапина на замке'],
      acceptRules: true,
    };
    const first = await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(finder.token))
      .set('Idempotency-Key', 'k-1')
      .send(body)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(finder.token))
      .set('Idempotency-Key', 'k-1')
      .send(body)
      .expect(201);
    expect(second.body.item.id).toBe(first.body.item.id); // Test 10
    expect(first.body.item.status).toBe('PENDING_REVIEW');
    expect(first.body.item.hiddenFeatures).toEqual(['царапина на замке']);
    await request(app.getHttpServer())
      .get(`/v1/items/${first.body.item.id}`)
      .set(auth(owner.token))
      .expect(404);

    // Text-only found item publishes immediately (no photo to check)
    const pub = await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(finder.token))
      .send({
        ...body,
        mediaIds: [],
        title: 'Найден синий кошелёк Levis',
        brand: 'Levis',
        color: 'blue',
      })
      .expect(201);
    expect(pub.body.item.status).toBe('PUBLISHED');
    foundItemId = pub.body.item.id;

    const publicView = await request(app.getHttpServer())
      .get(`/v1/items/${foundItemId}`)
      .expect(200);
    expect(publicView.body.hiddenFeatures).toBeUndefined();
    expect(publicView.body.owner.publicName).toBeDefined();
    expect(JSON.stringify(publicView.body)).not.toContain('царапина');
    await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(finder.token))
      .send({ ...body, mediaIds: [], acceptRules: false })
      .expect(400);
  });

  // ---- Test 3: no geolocation → manual district (already the only way) + search ----
  it('search works across Kyrgyz/Russian/Latin spellings and filters', async () => {
    const q = async (query: string) =>
      (await request(app.getHttpServer()).get(`/v1/items?${query}`).expect(200)).body
        .items as any[];
    expect((await q('q=кошелек')).map((i) => i.id)).toContain(foundItemId);
    expect((await q('q=капчык')).map((i) => i.id)).toContain(foundItemId); // category synonym
    expect((await q('q=koshelek')).map((i) => i.id)).toContain(foundItemId); // transliteration
    expect((await q(`categoryId=${cat('phones').id}`)).length).toBe(0);
    expect((await q(`locationId=${district().parentId}`)).map((i) => i.id)).toContain(foundItemId); // city includes districts
    const sug = await request(app.getHttpServer()).get('/v1/items/suggest?q=кош').expect(200);
    expect(sug.body).toContain('Кошельки');
  });

  it('lost item publishes and matching links it to the found item with safe reasons', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(owner.token))
      .set('Accept-Language', 'ky')
      .send({
        listingType: 'LOST',
        categoryId: cat('wallets').id,
        title: 'Потерял синий кошелёк',
        description: 'Levis, внутри карты',
        color: 'blue',
        brand: 'levis',
        approximateLocationId: district().id,
        eventTimeStart: new Date(Date.now() - 86_400_000).toISOString(),
        reward: { amount: 500, note: 'Благодарность' },
        hiddenFeatures: ['инициалы А.Б. внутри'],
        acceptRules: true,
      })
      .expect(201);
    lostItemId = res.body.item.id;
    expect(res.body.item.status).toBe('PUBLISHED');
    expect(res.body.matchesCount).toBeGreaterThanOrEqual(1);
    const matches = await request(app.getHttpServer())
      .get(`/v1/items/${lostItemId}/matches`)
      .set(auth(owner.token))
      .set('Accept-Language', 'ky')
      .expect(200);
    expect(matches.body[0].itemId).toBe(foundItemId);
    expect(matches.body[0].reasonCodes).toEqual(
      expect.arrayContaining(['same_category', 'similar_color', 'same_brand']),
    );
    expect(matches.body[0].score).toBeUndefined();
    expect(matches.body[0].reasons[0]).toBe('Ошол эле категория');
    await request(app.getHttpServer())
      .get(`/v1/items/${lostItemId}/matches`)
      .set(auth(stranger.token))
      .expect(403);
  });

  // ---- Test 6 + 7: claims, access control, brute-force limits ----
  it('claim flow: submit → owner sees evidence, stranger cannot; limits enforced', async () => {
    await request(app.getHttpServer())
      .post(`/v1/items/${foundItemId}/claims`)
      .set(auth(owner.token))
      .send({ evidence: [{ type: 'other', text: '   ' }] })
      .expect(400);
    const oldPhoto = await uploadImage(app, owner.token, await samplePng(), 'wallets');
    await request(app.getHttpServer())
      .post(`/v1/items/${foundItemId}/claims`)
      .set(auth(finder.token))
      .send({ evidence: [{ type: 'unique_feature', text: 'x' }] })
      .expect(400); // cannot claim own item

    const res = await request(app.getHttpServer())
      .post(`/v1/items/${foundItemId}/claims`)
      .set(auth(owner.token))
      .set('Accept-Language', 'ru')
      .send({
        message: 'Это мой кошелёк',
        evidence: [
          { type: 'unique_feature', text: 'Внутри инициалы А.Б.' },
          { type: 'old_photo', mediaId: oldPhoto.id },
        ],
      })
      .expect(201);
    claimId = res.body.id;
    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.intro).toContain('мошенников');

    await request(app.getHttpServer())
      .post(`/v1/items/${foundItemId}/claims`)
      .set(auth(owner.token))
      .send({ evidence: [{ type: 'other', text: 'again' }] })
      .expect(409); // duplicate active claim

    await request(app.getHttpServer())
      .get(`/v1/claims/${claimId}`)
      .set(auth(stranger.token))
      .expect(404); // Test 6
    const asFinder = await request(app.getHttpServer())
      .get(`/v1/claims/${claimId}`)
      .set(auth(finder.token))
      .expect(200);
    expect(asFinder.body.isItemOwner).toBe(true);
    expect(asFinder.body.evidence[0].text).toBe('Внутри инициалы А.Б.');
    await app.get(MediaService).purgeOrphans(0);
    const evidenceUrl = new URL(asFinder.body.evidence[1].attachmentUrl);
    await request(app.getHttpServer())
      .get(evidenceUrl.pathname + evidenceUrl.search)
      .expect(200);
    const incoming = await request(app.getHttpServer())
      .get('/v1/me/claims/incoming')
      .set(auth(finder.token))
      .expect(200);
    expect(incoming.body.map((c: any) => c.id)).toContain(claimId);

    // Notifications: finder got CLAIM_RECEIVED, owner got MATCH_FOUND earlier? (lost published after found → owner gets nothing; finder none). Check finder.
    const notifs = await request(app.getHttpServer())
      .get('/v1/notifications')
      .set(auth(finder.token))
      .expect(200);
    expect(notifs.body.items.some((n: any) => n.type === 'CLAIM_RECEIVED')).toBe(true);
    expect(notifs.body.items[0].title).toBe('Новая заявка');

    // Test 7: brute-force — stranger spams claims across items hits the daily cap (5)
    for (let i = 0; i < 6; i++) {
      const it = await request(app.getHttpServer())
        .post('/v1/items')
        .set(auth(finder.token))
        .send({
          listingType: 'FOUND',
          categoryId: cat('other').id,
          title: `Найдено ${i}`,
          acceptRules: true,
        })
        .expect(201);
      const r = await request(app.getHttpServer())
        .post(`/v1/items/${it.body.item.id}/claims`)
        .set(auth(stranger.token))
        .send({ evidence: [{ type: 'other', text: 'guess' }] });
      expect(r.status).toBe(i < 5 ? 201 : 429);
    }
  });

  // ---- Test 8: chat opens only after "plausible"; messages delivered to participants only; fraud hints ----
  it('owner decision "plausible" opens a conversation; messages flow via REST and WebSocket', async () => {
    await request(app.getHttpServer())
      .post(`/v1/claims/${claimId}/decision`)
      .set(auth(owner.token))
      .send({ decision: 'plausible' })
      .expect(403);
    const decided = await request(app.getHttpServer())
      .post(`/v1/claims/${claimId}/decision`)
      .set(auth(finder.token))
      .send({ decision: 'plausible' })
      .expect(200);
    expect(decided.body.status).toBe('PLAUSIBLE');
    conversationId = decided.body.conversationId;
    expect(conversationId).toBeTruthy();

    const list = await request(app.getHttpServer())
      .get('/v1/conversations')
      .set(auth(owner.token))
      .expect(200);
    expect(list.body[0].id).toBe(conversationId);
    expect(list.body[0].otherParticipant.id).toBe(finder.userId);

    // WebSocket: owner connects, finder sends via REST, owner receives.
    const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/ws?token=${owner.token}`);
    const received: any[] = [];
    await new Promise<void>((resolve, reject) => {
      ws.on('message', (raw) => {
        const f = JSON.parse(raw.toString());
        if (f.type === 'ready') resolve();
        received.push(f);
      });
      ws.on('error', reject);
    });
    const sent = await request(app.getHttpServer())
      .post(`/v1/conversations/${conversationId}/messages`)
      .set(auth(finder.token))
      .send({ body: 'Привет! Переведите предоплату 500 сом на карту', clientMessageId: 'c1' })
      .expect(201);
    expect(sent.body.warnings).toContain('advance_payment');
    await new Promise((r) => setTimeout(r, 200));
    expect(
      received.some(
        (f) => f.type === 'message' && f.message.id === sent.body.id && f.message.mine === false,
      ),
    ).toBe(true);

    // Send through the socket with ack + dedupe
    ws.send(
      JSON.stringify({
        type: 'send',
        conversationId,
        clientMessageId: 'ws-1',
        body: 'Договоримся о встрече у ТЦ',
      }),
    );
    await new Promise((r) => setTimeout(r, 300));
    const ack = received.find((f) => f.type === 'ack' && f.clientMessageId === 'ws-1');
    expect(ack).toBeTruthy();
    ws.send(
      JSON.stringify({
        type: 'send',
        conversationId,
        clientMessageId: 'ws-1',
        body: 'Договоримся о встрече у ТЦ',
      }),
    );
    await new Promise((r) => setTimeout(r, 300));
    ws.close();

    const history = await request(app.getHttpServer())
      .get(`/v1/conversations/${conversationId}/messages`)
      .set(auth(finder.token))
      .expect(200);
    const bodies = history.body.items.map((m: any) => m.body);
    expect(bodies.filter((b: string) => b === 'Договоримся о встрече у ТЦ').length).toBe(1); // deduped
    expect(history.body.items[0].kind).toBe('system');

    // Test 8 negative: stranger cannot read or write
    await request(app.getHttpServer())
      .get(`/v1/conversations/${conversationId}/messages`)
      .set(auth(stranger.token))
      .expect(404);
    await request(app.getHttpServer())
      .post(`/v1/conversations/${conversationId}/messages`)
      .set(auth(stranger.token))
      .send({ body: 'hi' })
      .expect(404);
    const badWs = new WebSocket(`${baseUrl.replace('http', 'ws')}/ws?token=bad`);
    const code = await new Promise<number>((resolve) => badWs.on('close', (c) => resolve(c)));
    expect(code).toBe(4401);
  });

  // ---- Test 13: handoff with single-use, expiring code ----
  it('handoff completes with the holder code; reused code is rejected; item becomes RESOLVED', async () => {
    const created = await request(app.getHttpServer())
      .post('/v1/handoffs')
      .set(auth(finder.token))
      .send({ claimId, method: 'meeting', placeNote: 'У входа в ТЦ' })
      .expect(201);
    expect(created.body.myRole).toBe('holder');
    expect(created.body.confirmationCode).toMatch(/^\d{6}$/);
    const code = created.body.confirmationCode;
    const asReceiver = await request(app.getHttpServer())
      .get(`/v1/handoffs/${created.body.id}`)
      .set(auth(owner.token))
      .expect(200);
    expect(asReceiver.body.confirmationCode).toBeUndefined();
    expect(asReceiver.body.myRole).toBe('receiver');

    await request(app.getHttpServer())
      .post(`/v1/handoffs/${created.body.id}/confirm`)
      .set(auth(owner.token))
      .send({ code: '000000' })
      .expect(400);
    const done = await request(app.getHttpServer())
      .post(`/v1/handoffs/${created.body.id}/confirm`)
      .set(auth(owner.token))
      .send({ code })
      .expect(200);
    expect(done.body.state).toBe('COMPLETED');
    await request(app.getHttpServer())
      .post(`/v1/handoffs/${created.body.id}/confirm`)
      .set(auth(owner.token))
      .send({ code })
      .expect(400);

    const item = await request(app.getHttpServer()).get(`/v1/items/${foundItemId}`).expect(200);
    expect(item.body.status).toBe('RESOLVED');
    const claim = await request(app.getHttpServer())
      .get(`/v1/claims/${claimId}`)
      .set(auth(owner.token))
      .expect(200);
    expect(claim.body.status).toBe('COMPLETED');
    const me = await request(app.getHttpServer()).get('/v1/me').set(auth(owner.token)).expect(200);
    expect(me.body.trustLevel).toBe('ContactVerified'); // account too young for Established
  });

  // ---- Test 11: report → admin panel ----
  it('report creates a moderation case visible to an admin; admin roles are enforced', async () => {
    await request(app.getHttpServer())
      .post('/v1/reports')
      .set(auth(stranger.token))
      .send({ targetType: 'item', targetId: lostItemId, reason: 'fraud', details: 'Подозрительно' })
      .expect(201);

    const adminSvc = app.get(AdminService);
    await adminSvc.createAdmin('mod@tabyldy.local', 'ModeratorPass123!', 'MODERATOR');
    await adminSvc.createAdmin('ro@tabyldy.local', 'ReadOnlyPass123!', 'READONLY_ANALYST');
    const mod = await request(app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send({ email: 'mod@tabyldy.local', password: 'ModeratorPass123!' })
      .expect(200);
    const ro = await request(app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send({ email: 'ro@tabyldy.local', password: 'ReadOnlyPass123!' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send({ email: 'mod@tabyldy.local', password: 'wrong-password' })
      .expect(401);

    const cases = await request(app.getHttpServer())
      .get('/v1/admin/cases?status=OPEN')
      .set(auth(mod.body.token))
      .expect(200);
    const reportCase = cases.body.find(
      (c: any) => c.kind === 'report' && c.item?.id === lostItemId,
    );
    expect(reportCase).toBeTruthy();
    expect(cases.body.some((c: any) => c.kind === 'item_review')).toBe(true); // from the unchecked photo

    await request(app.getHttpServer()).get('/v1/admin/cases').set(auth(ro.body.token)).expect(403);
    await request(app.getHttpServer())
      .post(`/v1/admin/cases/${reportCase.id}/resolve`)
      .set(auth(ro.body.token))
      .send({ resolution: 'ok' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/v1/admin/cases/${reportCase.id}/resolve`)
      .set(auth(mod.body.token))
      .send({ resolution: 'Не подтвердилось' })
      .expect(200);

    // Moderator approves the pending item → it becomes visible publicly
    const pending = await request(app.getHttpServer())
      .get('/v1/admin/items?status=PENDING_REVIEW')
      .set(auth(mod.body.token))
      .expect(200);
    expect(pending.body.length).toBe(1);
    await request(app.getHttpServer())
      .post(`/v1/admin/items/${pending.body[0].id}/status`)
      .set(auth(mod.body.token))
      .send({ status: 'PUBLISHED' })
      .expect(200);
    const nowPublic = await request(app.getHttpServer())
      .get(`/v1/items/${pending.body[0].id}`)
      .expect(200);
    expect(nowPublic.body.media[0].publicUrl).toBeTruthy();
    const imagePath = new URL(nowPublic.body.media[0].publicUrl).pathname;
    await request(app.getHttpServer()).get(imagePath).expect(200);
    await request(app.getHttpServer())
      .post(`/v1/admin/items/${pending.body[0].id}/status`)
      .set(auth(mod.body.token))
      .send({ status: 'REMOVED', note: 'Повторная проверка' })
      .expect(200);
    await request(app.getHttpServer()).get(imagePath).expect(404);

    // Audit log captured mutations (SUPER_ADMIN only)
    await request(app.getHttpServer()).get('/v1/admin/audit').set(auth(mod.body.token)).expect(403);
    await adminSvc.createAdmin('root@tabyldy.local', 'RootPassword1234!', 'SUPER_ADMIN');
    const root = await request(app.getHttpServer())
      .post('/v1/admin/auth/login')
      .send({ email: 'root@tabyldy.local', password: 'RootPassword1234!' })
      .expect(200);
    const audit = await request(app.getHttpServer())
      .get('/v1/admin/audit')
      .set(auth(root.body.token))
      .expect(200);
    expect(
      audit.body.some((a: any) => a.actorType === 'admin' && a.action.includes('status')),
    ).toBe(true);
    const overview = await request(app.getHttpServer())
      .get('/v1/admin/overview')
      .set(auth(ro.body.token))
      .expect(200);
    expect(overview.body.users).toBeGreaterThanOrEqual(3);
  });

  // ---- Test 15 + localization of errors ----
  it('errors are localized by Accept-Language, including Kyrgyz', async () => {
    const ky = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Accept-Language', 'ky')
      .expect(401);
    expect(ky.body.message).toBe('Улантуу үчүн байланышты ырастаңыз.');
    const ru = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Accept-Language', 'ru-RU,ru;q=0.9')
      .expect(401);
    expect(ru.body.message).toBe('Нужно подтвердить контакт, чтобы продолжить.');
    expect(ky.body.requestId).toBeTruthy();
  });

  it('analytics ingest drops disallowed events and PII props', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        anonymousId: 'anon-1',
        events: [
          { name: 'app_open', props: { platform: 'android', phone: '+996700', locale: 'ky' } },
        ],
      })
      .expect(202);
    expect(res.body.accepted).toBe(1);
    await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({ events: [{ name: 'message_body', props: {} }] })
      .expect(400);
  });

  // ---- Test 12: account deletion ----
  it('revoked sessions immediately lose REST and WebSocket access', async () => {
    const session = await login(app, '+996700000778');
    const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/ws?token=${session.token}`);
    await new Promise<void>((resolve, reject) => {
      ws.once('error', reject);
      ws.once('message', () => resolve());
    });
    await request(app.getHttpServer())
      .post('/v1/me/sessions/revoke-all')
      .set(auth(session.token))
      .expect(204);
    await request(app.getHttpServer()).get('/v1/me').set(auth(session.token)).expect(401);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    const closed = new Promise<number>((resolve) => ws.once('close', resolve));
    ws.send(JSON.stringify({ type: 'ping' }));
    expect(await closed).toBe(4401);
  });

  it('account deletion anonymizes the user, revokes sessions and closes listings', async () => {
    const victim = await login(app, '+996700000777');
    const it = await request(app.getHttpServer())
      .post('/v1/items')
      .set(auth(victim.token))
      .send({
        listingType: 'LOST',
        categoryId: cat('keys').id,
        title: 'Потерял ключи от квартиры',
        acceptRules: true,
      })
      .expect(201);
    await request(app.getHttpServer()).delete('/v1/me').set(auth(victim.token)).expect(204);
    await request(app.getHttpServer()).get('/v1/me').set(auth(victim.token)).expect(401);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: victim.refreshToken })
      .expect(401);
    const gone = await request(app.getHttpServer()).get(`/v1/items/${it.body.item.id}`).expect(404);
    expect(gone.body.details.state).toBe('item_unavailable');
    const profile = await request(app.getHttpServer())
      .get(`/v1/users/${victim.userId}/public`)
      .expect(200);
    expect(profile.body.publicName).toBe('Удалённый пользователь');
    // Re-login with the same phone creates a fresh account
    const fresh = await login(app, '+996700000777');
    expect(fresh.userId).not.toBe(victim.userId);
  });

  // ---- No-registration posting: guest device account, upgraded or merged on sign-in ----
  it('guest posts a find without sign-up; verifying later keeps or merges it', async () => {
    const server = app.getHttpServer();
    const newGuest = async () => {
      const g = await request(server)
        .post('/v1/auth/guest')
        .send({ platform: 'android' })
        .expect(201);
      expect(g.body.accessToken).toBeTruthy();
      return g.body as { accessToken: string; refreshToken: string; userId: string };
    };
    const postFind = async (token: string, title: string) => {
      const res = await request(server)
        .post('/v1/items')
        .set(auth(token))
        .send({
          listingType: 'FOUND',
          categoryId: cat('wallets').id,
          title,
          description: 'Нашёл у остановки',
          approximateLocationId: district().id,
          mediaIds: [],
          acceptRules: true,
        })
        .expect(201);
      return res.body.item.id as string;
    };
    const verifyWith = async (destination: string, guestRefreshToken: string) => {
      const start = await request(server)
        .post('/v1/auth/start')
        .send({ channel: 'phone', destination })
        .expect(200);
      const v = await request(server)
        .post('/v1/auth/verify')
        .send({ challengeId: start.body.challengeId, code: start.body.devCode, guestRefreshToken })
        .expect(200);
      return v.body as { accessToken: string; userId: string };
    };

    // 1. Guest → new phone: the same account becomes verified.
    const g1 = await newGuest();
    const me1 = await request(server).get('/v1/me').set(auth(g1.accessToken)).expect(200);
    expect(me1.body.trustLevel).toBe('Guest');
    const item1 = await postFind(g1.accessToken, 'Найдены ключи гостем');
    const up = await verifyWith('+996700000555', g1.refreshToken);
    expect(up.userId).toBe(g1.userId);
    const me1b = await request(server).get('/v1/me').set(auth(up.accessToken)).expect(200);
    expect(me1b.body.trustLevel).toBe('ContactVerified');
    const mine1 = await request(server).get('/v1/me/items').set(auth(up.accessToken)).expect(200);
    expect(mine1.body.map((i: { id: string }) => i.id)).toContain(item1);

    // 2. Guest → phone of an existing account: the find moves there, the guest is retired.
    const g2 = await newGuest();
    const item2 = await postFind(g2.accessToken, 'Найден рюкзак гостем');
    const merged = await verifyWith('+996700000001', g2.refreshToken);
    expect(merged.userId).toBe(finder.userId);
    const mine2 = await request(server)
      .get('/v1/me/items')
      .set(auth(merged.accessToken))
      .expect(200);
    expect(mine2.body.map((i: { id: string }) => i.id)).toContain(item2);
    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: g2.refreshToken })
      .expect(401);
  });

  // ---- Contact phone on a listing: private until the author approves a claim ----
  it('listing phone is hidden publicly and revealed only to an approved claimant', async () => {
    const server = app.getHttpServer();
    // Earlier tests used up the per-IP limits (sign-in, claims): start this one clean.
    const throttle = app.get(ThrottlerStorage) as unknown as {
      storage: Map<string, unknown>;
      hitExpirations: Map<string, unknown>;
    };
    throttle.storage.clear();
    throttle.hitExpirations.clear();
    const guest = async () => {
      const g = await request(server).post('/v1/auth/guest').send({}).expect(201);
      return { token: g.body.accessToken as string };
    };
    const author = await guest();
    const claimant = await guest();

    await request(server)
      .post('/v1/items')
      .set(auth(author.token))
      .send({
        listingType: 'FOUND',
        categoryId: cat('wallets').id,
        title: 'Найден коричневый кошелёк',
        mediaIds: [],
        contactPhone: 'not a phone',
        acceptRules: true,
      })
      .expect(400);
    const created = await request(server)
      .post('/v1/items')
      .set(auth(author.token))
      .send({
        listingType: 'FOUND',
        categoryId: cat('wallets').id,
        title: 'Найден коричневый кошелёк',
        approximateLocationId: district().id,
        mediaIds: [],
        hiddenFeatures: ['внутри фото'],
        contactPhone: '0700 123 456',
        acceptRules: true,
      })
      .expect(201);
    const itemId = created.body.item.id as string;
    expect(created.body.item.contactPhone).toBe('+996700123456');

    // Public views never carry the phone.
    const publicView = await request(server)
      .get(`/v1/items/${itemId}`)
      .set(auth(claimant.token))
      .expect(200);
    expect(JSON.stringify(publicView.body)).not.toContain('700123456');
    const feed = await request(server).get('/v1/items?type=FOUND').expect(200);
    expect(JSON.stringify(feed.body)).not.toContain('700123456');

    // Editing hidden features keeps the phone (private fields are merged).
    await request(server)
      .patch(`/v1/items/${itemId}`)
      .set(auth(author.token))
      .send({ hiddenFeatures: ['внутри фото', 'порван угол'] })
      .expect(200);
    const own = await request(server)
      .get(`/v1/items/${itemId}`)
      .set(auth(author.token))
      .expect(200);
    expect(own.body.contactPhone).toBe('+996700123456');

    const claim = await request(server)
      .post(`/v1/items/${itemId}/claims`)
      .set(auth(claimant.token))
      .send({ evidence: [{ type: 'unique_feature', text: 'Внутри фотография и порван угол' }] })
      .expect(201);
    expect(claim.body.contactPhone).toBeNull();

    const decided = await request(server)
      .post(`/v1/claims/${claim.body.id}/decision`)
      .set(auth(author.token))
      .send({ decision: 'plausible' })
      .expect(200);
    // The author is not the claimant: the field stays empty in their own view.
    expect(decided.body.contactPhone).toBeNull();
    const approved = await request(server)
      .get(`/v1/claims/${claim.body.id}`)
      .set(auth(claimant.token))
      .expect(200);
    expect(approved.body.contactPhone).toBe('+996700123456');
  });
});
