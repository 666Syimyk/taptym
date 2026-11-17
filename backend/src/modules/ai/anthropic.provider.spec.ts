import { AnthropicAiProvider } from './anthropic.provider';

/** Replaces the SDK call so the request shape and parsing can be checked offline. */
function providerWith(response: unknown) {
  const provider = new AnthropicAiProvider('test-key', 'claude-opus-5-5', 1000);
  const create = jest.fn().mockResolvedValue(response);
  (provider as any).client = { beta: { messages: { create } } };
  return { provider, create };
}

const answer = (json: object) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify(json) }],
});

describe('AnthropicAiProvider.analyzeImage', () => {
  const photo = Buffer.from('fake-jpeg');

  it('fills brand, model, colour and category, offering categories from the database', async () => {
    const { provider, create } = providerWith(
      answer({
        categorySlug: 'phones',
        color: 'black',
        brand: 'Apple',
        model: 'iPhone 13',
        titleRu: 'Найден чёрный iPhone 13',
        titleKy: 'Кара iPhone 13 табылды',
        descriptionRu: 'Смартфон в прозрачном чехле, на экране царапина.',
        descriptionKy: 'Тунук кабы бар смартфон.',
        confidence: 0.92,
        quality: 'ok',
      }),
    );
    const out = await provider.analyzeImage(photo, 'image/jpeg', {
      listingType: 'FOUND',
      categories: [
        { slug: 'phones', nameRu: 'Телефоны' },
        { slug: 'scooters', nameRu: 'Самокаты' },
      ],
    });
    expect(out).toMatchObject({
      categorySlug: 'phones',
      color: 'black',
      brand: 'Apple',
      model: 'iPhone 13',
      confidence: 0.92,
    });

    const request = create.mock.calls[0][0];
    expect(request.model).toBe('claude-opus-5-5');
    expect(request.fallbacks).toBe('default');
    expect(request.output_config.effort).toBe('low');
    const schema = request.output_config.format.schema;
    expect(schema.properties.categorySlug.enum).toEqual(['phones', 'scooters', null]);
    expect(schema.required).toEqual(expect.arrayContaining(['brand', 'model']));
    const prompt = request.messages[0].content[1].text as string;
    expect(prompt).toContain('scooters: Самокаты');
    expect(prompt).toContain('FOUND');
  });

  it('words lost items as lost and trims empty or oversized values', async () => {
    const { provider, create } = providerWith(
      answer({
        categorySlug: null,
        color: null,
        brand: '   ',
        model: null,
        titleRu: 'Потерян рюкзак ' + 'x'.repeat(200),
        titleKy: null,
        descriptionRu: null,
        descriptionKy: null,
        confidence: 7,
        quality: 'blurry',
      }),
    );
    const out = await provider.analyzeImage(photo, 'image/jpeg', {
      listingType: 'LOST',
      categories: [],
    });
    expect(out!.brand).toBeNull();
    expect(out!.titleRu!.length).toBe(80);
    expect(out!.confidence).toBe(1);
    const prompt = create.mock.calls[0][0].messages[0].content[1].text as string;
    expect(prompt).toContain('Потерян');
    // Falls back to the seeded categories when none are passed.
    expect(prompt).toContain('wallets');
  });

  it('returns no suggestions on a refusal or a broken answer', async () => {
    const refused = providerWith({ stop_reason: 'refusal', stop_details: null, content: [] });
    await expect(
      refused.provider.analyzeImage(photo, 'image/jpeg', { listingType: 'FOUND', categories: [] }),
    ).resolves.toBeNull();
    const broken = providerWith({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'not json' }],
    });
    await expect(
      broken.provider.analyzeImage(photo, 'image/jpeg', { listingType: 'FOUND', categories: [] }),
    ).resolves.toBeNull();
  });
});
