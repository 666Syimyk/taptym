import { CATEGORY_SEED } from '../../database/seed';
import { textHints } from './text-hints';

const cats = CATEGORY_SEED.map((c) => ({
  slug: c.slug,
  nameRu: c.nameRu,
  nameKy: c.nameKy,
  synonyms: [...c.synonyms],
}));
const hints = (title: string, description = '') => textHints(title, description, cats);

describe('text hints', () => {
  it.each([
    ['Потерял чёрный кошелёк', 'wallets', 'black'],
    ['Потеряла кошелька с картами', 'wallets', null],
    ['Найдены ключи от квартиры', 'keys', null],
    ['Синий рюкзак', 'bags', 'blue'],
    ['потеряла сумочку бежевую', 'bags', 'beige'],
    ['Золотое кольцо', 'jewelry', 'gold'],
    ['Серебряные сережки', 'jewelry', 'silver'],
    ['Белые наушники', 'electronics', 'white'],
    ['Пропала собака, рыжая', 'pets', 'orange'],
    ['Кара капчык', 'wallets', 'black'],
    ['Көк телефонумду жоготтум', 'phones', 'blue'],
    ['Кызгылт сары рюкзак', 'bags', 'orange'],
    ['Паспорт на имя', 'documents', null],
    ['Банковская карта', 'bank_cards', null],
    ['Очки в футляре', 'glasses', null],
  ])('%s → %s, %s', (title, slug, color) => {
    expect(hints(title)).toMatchObject({ categorySlug: slug, color });
  });

  it('does not mistake look-alike words', () => {
    // "час назад" is an hour, not a watch; "серьги" is not "серый"; "картофель" is not a card.
    expect(hints('Потерял час назад').categorySlug).toBeNull();
    expect(hints('Серьги').color).toBeNull();
    expect(hints('Пакет с картофелем').categorySlug).toBe('bags');
  });

  it('reads brands and lets the item word decide the category', () => {
    expect(hints('Потерял айфон 13')).toMatchObject({
      categorySlug: 'phones',
      brand: 'Apple iPhone',
    });
    expect(hints('Samsung наушники')).toMatchObject({
      categorySlug: 'electronics',
      brand: 'Samsung',
    });
    expect(hints('AirPods Pro')).toMatchObject({ categorySlug: 'electronics' });
  });

  it('prefers the title over the description', () => {
    expect(hints('Рюкзак', 'внутри был кошелёк и ключи').categorySlug).toBe('bags');
    expect(hints('Вещь', 'чёрный кошелёк').categorySlug).toBe('wallets');
  });
});
