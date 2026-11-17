import type { ColorKey } from '../../common/text';

/**
 * Understands a short description ("потерял чёрный кошелёк Samsung", "кара капчык")
 * well enough to pre-select the category, colour and brand. Pure functions, no
 * network: Russian case endings, Kyrgyz words and Latin brand names.
 */

export interface TextHints {
  categorySlug: string | null;
  color: ColorKey | null;
  brand: string | null;
}

export interface HintCategory {
  slug: string;
  nameRu: string;
  nameKy: string;
  synonyms: string[];
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

// ------------------------------------------------------------------ colours

const RU_ENDINGS =
  '(ый|ий|ой|ая|яя|ое|ее|ого|его|ому|ему|ую|юю|ые|ие|ых|их|ым|им|ыми|ими|ом|ем|о|а|ы|е)';

const RU_COLOR_STEMS: [ColorKey, string[]][] = [
  ['black', ['черн']],
  ['white', ['бел']],
  ['gray', ['сер', 'графитов', 'пепельн']],
  ['red', ['красн', 'бордов', 'вишнев']],
  ['orange', ['оранжев', 'рыж']],
  ['yellow', ['желт']],
  ['green', ['зелен', 'салатов', 'изумрудн']],
  ['blue', ['син', 'голуб', 'бирюзов']],
  ['purple', ['фиолетов', 'сиренев', 'лилов']],
  ['pink', ['розов', 'малинов']],
  ['brown', ['коричнев', 'шоколадн']],
  ['beige', ['бежев', 'кремов']],
  ['gold', ['золот', 'золотист']],
  ['silver', ['серебрист', 'серебрян', 'серебр']],
  ['multicolor', ['разноцветн', 'пестр', 'цветаст']],
];

const RU_COLOR_RE: [ColorKey, RegExp][] = RU_COLOR_STEMS.map(([key, stems]) => [
  key,
  new RegExp(`^(${stems.join('|')})${RU_ENDINGS}$`),
]);

/** Kyrgyz and English colour words, matched as whole tokens. */
const WORD_COLORS: Record<string, ColorKey> = {
  кара: 'black',
  ак: 'white',
  боз: 'gray',
  кызыл: 'red',
  сары: 'yellow',
  жашыл: 'green',
  көк: 'blue',
  кызгылт: 'pink',
  күрөң: 'brown',
  алтын: 'gold',
  күмүш: 'silver',
  хаки: 'green',
  black: 'black',
  white: 'white',
  gray: 'gray',
  grey: 'gray',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  purple: 'purple',
  pink: 'pink',
  brown: 'brown',
  beige: 'beige',
  gold: 'gold',
  silver: 'silver',
};

/** Two-word Kyrgyz colours win over their parts ("кызгылт сары" is orange). */
const KY_PAIRS: [string, string, ColorKey][] = [
  ['кызгылт', 'сары', 'orange'],
  ['кочкул', 'көк', 'purple'],
  ['ар', 'түстүү', 'multicolor'],
];

export function colorFromTokens(tokens: string[]): ColorKey | null {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    for (const [a, b, key] of KY_PAIRS) if (t === a && tokens[i + 1] === b) return key;
    if (WORD_COLORS[t]) return WORD_COLORS[t];
    for (const [key, re] of RU_COLOR_RE) if (t.length > 2 && re.test(t)) return key;
  }
  return null;
}

// ------------------------------------------------------------------- brands

const BRANDS: { brand: string; aliases: string[]; category?: string }[] = [
  { brand: 'Apple iPhone', aliases: ['iphone', 'айфон', 'айфона', 'айфоне'], category: 'phones' },
  {
    brand: 'Apple AirPods',
    aliases: ['airpods', 'аирподс', 'эирподс', 'эйрподс'],
    category: 'electronics',
  },
  { brand: 'Apple MacBook', aliases: ['macbook', 'макбук'], category: 'electronics' },
  { brand: 'Apple iPad', aliases: ['ipad', 'айпад'], category: 'electronics' },
  { brand: 'Apple Watch', aliases: ['applewatch'], category: 'electronics' },
  { brand: 'Apple', aliases: ['apple', 'эпл', 'эппл'] },
  { brand: 'Samsung', aliases: ['samsung', 'самсунг', 'galaxy', 'галакси'] },
  { brand: 'Xiaomi', aliases: ['xiaomi', 'сяоми', 'ксиаоми', 'redmi', 'редми', 'poco'] },
  { brand: 'Huawei', aliases: ['huawei', 'хуавей', 'хуавэй'] },
  { brand: 'Honor', aliases: ['honor', 'хонор'] },
  { brand: 'Realme', aliases: ['realme', 'реалми'] },
  { brand: 'Tecno', aliases: ['tecno', 'текно'] },
  { brand: 'Infinix', aliases: ['infinix'] },
  { brand: 'Oppo', aliases: ['oppo'] },
  { brand: 'Vivo', aliases: ['vivo'] },
  { brand: 'Nokia', aliases: ['nokia', 'нокиа'] },
  { brand: 'Sony', aliases: ['sony', 'сони'] },
  { brand: 'JBL', aliases: ['jbl'] },
  { brand: 'Lenovo', aliases: ['lenovo', 'леново'] },
  { brand: 'Asus', aliases: ['asus', 'асус'] },
  { brand: 'Acer', aliases: ['acer'] },
  { brand: 'HP', aliases: ['hp'] },
  { brand: 'Dell', aliases: ['dell'] },
  { brand: 'Casio', aliases: ['casio', 'касио'] },
  { brand: 'Adidas', aliases: ['adidas', 'адидас'] },
  { brand: 'Nike', aliases: ['nike', 'найк'] },
  { brand: 'Puma', aliases: ['puma', 'пума'] },
  { brand: 'Zara', aliases: ['zara', 'зара'] },
];

export function brandFromTokens(tokens: string[]): { brand: string; category?: string } | null {
  // "apple watch" as two words
  for (let i = 0; i < tokens.length - 1; i++)
    if (tokens[i] === 'apple' && tokens[i + 1] === 'watch')
      return { brand: 'Apple Watch', category: 'electronics' };
  for (const b of BRANDS) if (tokens.some((t) => b.aliases.includes(t))) return b;
  return null;
}

// --------------------------------------------------------------- categories

/** Everyday words that are not in the category synonyms of the seed. */
const EXTRA_TERMS: Record<string, string[]> = {
  wallets: ['кошелечек', 'визитница', 'wallet'],
  documents: ['паспорта', 'загранпаспорт', 'свидетельство', 'диплом', 'пропуск', 'passport'],
  bank_cards: ['карточка', 'карточку', 'карточкой', 'кредитка', 'дебетовая'],
  phones: ['телефончик', 'сотовый', 'phone', 'смартфона'],
  electronics: [
    'наушник',
    'зарядка',
    'зарядку',
    'зарядное',
    'powerbank',
    'ноутбука',
    'макбук',
    'часов',
    'часами',
    'часики',
    'камера',
    'фотоаппарат',
    'флешка',
  ],
  keys: ['ключики', 'ключей', 'ключами', 'keys'],
  bags: ['сумочка', 'сумочку', 'клатч', 'барсетка', 'чемодана', 'портфеля'],
  jewelry: ['сережки', 'сережка', 'кулон', 'подвеска', 'колечко', 'цепь', 'цепочку'],
  clothing: [
    'пальто',
    'пуховик',
    'кофта',
    'свитер',
    'кроссовки',
    'ботинки',
    'обувь',
    'зонтик',
    'варежки',
    'жилет',
  ],
  glasses: ['очков', 'очками', 'линзы', 'футляр'],
  pets: ['котенок', 'котик', 'щенка', 'собаку', 'кошку', 'попугай'],
  toys: ['игрушку', 'плюшевый', 'самокатик'],
  transport: ['велосипеда', 'велик', 'самоката', 'электросамокат', 'шлема'],
};

/** Words that look like stems of other words ("час" vs "часы") match exactly. */
const EXACT_ONLY = new Set(['часы', 'права', 'кот', 'ит', 'ид', 'id', 'очки', 'саат']);

/** Brand names are not evidence of a category ("Samsung наушники" are headphones). */
const BRAND_WORDS = new Set(BRANDS.flatMap((b) => b.aliases));

const VOWEL_END = /[аеиоуыэюяьй]$/;

function matcher(term: string): (tokens: string[], i: number) => number {
  const words = tokenize(term);
  if (!words.length) return () => 0;
  const single = (w: string): ((t: string) => boolean) => {
    if (w.length <= 3 || EXACT_ONLY.has(w)) return (t) => t === w;
    // Long words keep room for Kyrgyz suffixes ("телефонумду"), short ones stay tight
    // so that "карта" does not catch "картофель".
    if (w.length >= 6) {
      const stem = w.slice(0, -2);
      return (t) => t.startsWith(stem) && t.length <= stem.length + 7;
    }
    const stem = VOWEL_END.test(w) ? w.slice(0, -1) : w;
    return (t) => t.startsWith(stem) && t.length <= stem.length + 3;
  };
  const parts = words.map(single);
  return (tokens, i) =>
    parts.every((p, k) => tokens[i + k] && p(tokens[i + k])) ? words.length : 0;
}

export function categoryFromTokens(
  titleTokens: string[],
  bodyTokens: string[],
  categories: HintCategory[],
): string | null {
  let best: { slug: string; score: number; first: number } | null = null;
  for (const c of categories) {
    if (c.slug === 'other') continue;
    const terms = [c.nameRu, c.nameKy, ...c.synonyms, ...(EXTRA_TERMS[c.slug] ?? [])].filter(
      (t) => !BRAND_WORDS.has(t.toLowerCase()),
    );
    const matchers = terms.map(matcher);
    let score = 0;
    let first = Infinity;
    const scan = (tokens: string[], weight: number, offset: number) => {
      for (let i = 0; i < tokens.length; i++) {
        for (const m of matchers) {
          const n = m(tokens, i);
          if (n) {
            score += weight * n;
            first = Math.min(first, offset + i);
            break;
          }
        }
      }
    };
    scan(titleTokens, 2, 0);
    scan(bodyTokens, 1, 1000);
    if (score && (!best || score > best.score || (score === best.score && first < best.first)))
      best = { slug: c.slug, score, first };
  }
  return best?.slug ?? null;
}

export function textHints(
  title: string,
  description: string,
  categories: HintCategory[],
): TextHints {
  const titleTokens = tokenize(title);
  const bodyTokens = tokenize(description);
  const all = [...titleTokens, ...bodyTokens];
  const brand = brandFromTokens(all);
  const known = new Set(categories.map((c) => c.slug));
  let categorySlug = categoryFromTokens(titleTokens, bodyTokens, categories);
  if (!categorySlug && brand?.category && known.has(brand.category)) categorySlug = brand.category;
  return {
    categorySlug,
    color: colorFromTokens(titleTokens) ?? colorFromTokens(bodyTokens),
    brand: brand?.brand ?? null,
  };
}
