import sharp from 'sharp';
import { CATEGORY_SEED } from '../../../database/seed';
import { mergeAnalyses } from '../composite.provider';
import { LabelIndex, labelsFingerprint } from './label-index';
import { LOCAL_LABELS, localTitles } from './labels';
import { LocalAiProvider, pickColor } from './local.provider';
import type { VisionModel } from './vision-model';

const index = new LabelIndex();
const vectorOf = (id: string) => index.labels.find((l) => l.label.id === id)!.vector;
const label = (id: string) => LOCAL_LABELS.find((l) => l.id === id)!;
const categories = CATEGORY_SEED.map((c) => ({ slug: c.slug, nameRu: c.nameRu }));

/** A model stub that "sees" whatever label vector it is given. */
function fakeModel(vector: Float32Array | null): VisionModel {
  return {
    available: () => vector !== null,
    embed: async () => vector,
    state: vector ? 'ready' : 'missing',
  } as unknown as VisionModel;
}

const photo = (r: number, g: number, b: number) =>
  sharp({
    create: { width: 160, height: 160, channels: 3, background: { r: 245, g: 245, b: 245 } },
  })
    .composite([
      {
        input: { create: { width: 80, height: 80, channels: 3, background: { r, g, b } } },
        left: 40,
        top: 40,
      },
    ])
    .jpeg()
    .toBuffer();

describe('label embeddings', () => {
  it('match the labels in code (rebuild with scripts/build-ai-labels.ts)', () => {
    expect(index.fingerprint).toBe(labelsFingerprint());
    expect(index.labels).toHaveLength(LOCAL_LABELS.length);
    expect(index.colors).toHaveLength(15);
  });

  it('recognise each label from its own text vector', () => {
    for (const l of LOCAL_LABELS.filter((x) => x.category)) {
      const top = index.classify(vectorOf(l.id))[0];
      expect(top.label.id).toBe(l.id);
    }
  });
});

describe('titles', () => {
  it('agree in gender and number, in both languages', () => {
    expect(localTitles(label('wallet'), 'black', 'FOUND')).toEqual({
      ru: 'Найден чёрный кошелёк',
      ky: 'Кара капчык табылды',
    });
    expect(localTitles(label('handbag'), 'red', 'LOST').ru).toBe('Потеряна красная сумка');
    expect(localTitles(label('ring'), 'gold', 'FOUND').ru).toBe('Найдено золотистое кольцо');
    expect(localTitles(label('keys'), null, 'LOST')).toEqual({
      ru: 'Потеряны ключи',
      ky: 'Ачкычтар жоголду',
    });
    expect(localTitles(label('smartphone'), 'green', 'FOUND', 'Apple iPhone').ru).toBe(
      'Найден зелёный iPhone',
    );
    expect(localTitles(label('smartphone'), null, 'FOUND', 'Samsung').ru).toBe(
      'Найден телефон Samsung',
    );
  });
});

describe('pickColor', () => {
  it('turns metal colours into gold and silver for jewellery', () => {
    expect(pickColor({ color: 'orange', confidence: 0.6 }, null, label('ring'))?.color).toBe(
      'gold',
    );
    expect(pickColor({ color: 'gray', confidence: 0.6 }, null, label('necklace'))?.color).toBe(
      'silver',
    );
    expect(pickColor({ color: 'orange', confidence: 0.6 }, null, label('wallet'))?.color).toBe(
      'orange',
    );
  });
  it('trusts a very sure model over pixels, and pixels otherwise', () => {
    const model = (color: any, probability: number) => [{ color, probability }];
    expect(pickColor({ color: 'black', confidence: 0.9 }, model('green', 0.97), null)?.color).toBe(
      'green',
    );
    expect(pickColor({ color: 'black', confidence: 0.8 }, model('gray', 0.7), null)?.color).toBe(
      'black',
    );
    expect(pickColor({ color: 'gray', confidence: 0.5 }, model('black', 0.5), null)?.color).toBe(
      'black',
    );
  });
});

describe('LocalAiProvider', () => {
  it('fills category, colour and title from the photo', async () => {
    const p = new LocalAiProvider(fakeModel(vectorOf('wallet')));
    const out = await p.analyzeImage(await photo(20, 20, 22), 'image/jpeg', {
      listingType: 'FOUND',
      categories,
    });
    expect(out).toMatchObject({
      categorySlug: 'wallets',
      color: 'black',
      titleRu: 'Найден чёрный кошелёк',
      titleKy: 'Кара капчык табылды',
      source: 'local',
    });
    expect(out!.confidence).toBeGreaterThan(0.5);
  });

  it('only offers categories that exist', async () => {
    const p = new LocalAiProvider(fakeModel(vectorOf('wallet')));
    const out = await p.analyzeImage(await photo(20, 20, 22), 'image/jpeg', {
      listingType: 'FOUND',
      categories: categories.filter((c) => c.slug !== 'wallets'),
    });
    expect(out?.categorySlug).not.toBe('wallets');
  });

  it('works without the model: colour and quality only', async () => {
    const p = new LocalAiProvider(fakeModel(null));
    const out = await p.analyzeImage(await photo(30, 80, 200), 'image/jpeg', {
      listingType: 'LOST',
      categories,
    });
    expect(out).toMatchObject({ categorySlug: null, color: 'blue', titleRu: null, quality: 'ok' });
    expect(p.status().recognition).toBe('missing');
  });

  it('keeps passports off the public listing and never calls a photo safe', async () => {
    const passport = new LocalAiProvider(fakeModel(vectorOf('passport')));
    expect(await passport.checkSensitive(await photo(120, 30, 40))).toMatchObject({
      status: 'blocked',
      findings: ['identity_document'],
    });
    const wallet = new LocalAiProvider(fakeModel(vectorOf('wallet')));
    expect((await wallet.checkSensitive(await photo(20, 20, 20))).status).toBe('unavailable');
  });
});

describe('mergeAnalyses', () => {
  const base = {
    categorySlug: null,
    color: null,
    brand: null,
    model: null,
    titleRu: null,
    titleKy: null,
    descriptionRu: null,
    descriptionKy: null,
    confidence: 0,
    quality: 'unknown' as const,
  };
  it('keeps Claude’s answer and fills gaps from the local one', () => {
    const merged = mergeAnalyses(
      {
        ...base,
        categorySlug: 'phones',
        brand: 'Apple',
        model: 'iPhone 13',
        titleRu: 'Найден iPhone 13',
        confidence: 0.9,
      },
      {
        ...base,
        categorySlug: 'phones',
        color: 'green',
        titleRu: 'Найден зелёный iPhone',
        confidence: 0.7,
        quality: 'ok',
      },
    );
    expect(merged).toMatchObject({
      categorySlug: 'phones',
      color: 'green',
      model: 'iPhone 13',
      titleRu: 'Найден iPhone 13',
      quality: 'ok',
      source: 'anthropic',
    });
  });
  it('uses the local answer when Claude gives nothing', () => {
    const local = { ...base, categorySlug: 'bags', confidence: 0.8, source: 'local' as const };
    expect(mergeAnalyses(null, local)).toBe(local);
  });
});
