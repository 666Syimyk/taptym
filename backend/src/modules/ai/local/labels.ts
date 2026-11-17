import type { ColorKey } from '../../../common/text';

/**
 * What the on-device recogniser can name. Each label has English prompts for the
 * image–text model, the category it belongs to and the words used to write a title.
 *
 * The prompt embeddings are computed offline (scripts/build-ai-labels.mjs) and
 * stored in label-embeddings.json; change a prompt here → rebuild that file.
 */

type Gender = 'm' | 'f' | 'n' | 'pl';

export interface LocalLabel {
  id: string;
  /** Category slug from the seed; null for "not an item" labels that absorb noise. */
  category: string | null;
  prompts: string[];
  ru?: { noun: string; gender: Gender };
  ky?: string;
  /** Metal items: grey reads as silver, yellow/orange as gold. */
  metal?: boolean;
  /** A confident match means the photo itself must not be published. */
  sensitive?: 'identity_document' | 'bank_card' | 'key_profile';
}

export const LOCAL_LABELS: LocalLabel[] = [
  // ---- wallets
  {
    id: 'wallet',
    category: 'wallets',
    prompts: ['a wallet', 'a leather wallet', 'an open wallet with cards and money'],
    ru: { noun: 'кошелёк', gender: 'm' },
    ky: 'капчык',
  },
  // ---- documents and cards
  {
    id: 'passport',
    category: 'documents',
    prompts: ['a passport', 'a passport booklet', 'a passport cover'],
    ru: { noun: 'паспорт', gender: 'm' },
    ky: 'паспорт',
    sensitive: 'identity_document',
  },
  {
    id: 'id_card',
    category: 'documents',
    prompts: ['an identity card', "a driver's license card", 'a student ID card with a photo'],
    ru: { noun: 'документ', gender: 'm' },
    ky: 'документ',
    sensitive: 'identity_document',
  },
  {
    id: 'papers',
    category: 'documents',
    prompts: ['printed documents and papers', 'an envelope with documents'],
    ru: { noun: 'документы', gender: 'pl' },
    ky: 'документтер',
  },
  {
    id: 'bank_card',
    category: 'bank_cards',
    prompts: ['a credit card', 'a bank card', 'a debit card with a chip'],
    ru: { noun: 'банковская карта', gender: 'f' },
    ky: 'банк картасы',
    sensitive: 'bank_card',
  },
  // ---- phones and electronics
  {
    id: 'smartphone',
    category: 'phones',
    prompts: ['a smartphone', 'a mobile phone', 'the back of a smartphone with cameras'],
    ru: { noun: 'телефон', gender: 'm' },
    ky: 'телефон',
  },
  {
    id: 'earbuds',
    category: 'electronics',
    prompts: [
      'wireless earbuds',
      'a wireless earbuds charging case',
      'a small white earphone case',
      'AirPods',
    ],
    ru: { noun: 'наушники', gender: 'pl' },
    ky: 'кулакчын',
  },
  {
    id: 'headphones',
    category: 'electronics',
    prompts: ['headphones', 'over-ear headphones'],
    ru: { noun: 'наушники', gender: 'pl' },
    ky: 'кулакчын',
  },
  {
    id: 'laptop',
    category: 'electronics',
    prompts: ['a laptop computer', 'a notebook computer'],
    ru: { noun: 'ноутбук', gender: 'm' },
    ky: 'ноутбук',
  },
  {
    id: 'tablet',
    category: 'electronics',
    prompts: ['a tablet computer', 'an iPad'],
    ru: { noun: 'планшет', gender: 'm' },
    ky: 'планшет',
  },
  {
    id: 'watch',
    category: 'electronics',
    prompts: ['a wristwatch', 'a smartwatch', 'a watch with a strap'],
    ru: { noun: 'часы', gender: 'pl' },
    ky: 'саат',
    metal: true,
  },
  {
    id: 'charger',
    category: 'electronics',
    prompts: ['a power bank', 'a phone charger with a cable'],
    ru: { noun: 'зарядное устройство', gender: 'n' },
    ky: 'кубаттагыч',
  },
  {
    id: 'camera',
    category: 'electronics',
    prompts: ['a digital camera', 'a photo camera'],
    ru: { noun: 'фотоаппарат', gender: 'm' },
    ky: 'фотоаппарат',
  },
  // ---- keys
  {
    id: 'keys',
    category: 'keys',
    prompts: ['a bunch of keys', 'keys on a keyring', 'a house key'],
    ru: { noun: 'ключи', gender: 'pl' },
    ky: 'ачкычтар',
    sensitive: 'key_profile',
  },
  {
    id: 'car_key',
    category: 'keys',
    prompts: ['a car key fob', 'a car remote key'],
    ru: { noun: 'ключ от машины', gender: 'm' },
    ky: 'машинанын ачкычы',
  },
  // ---- bags
  {
    id: 'backpack',
    category: 'bags',
    prompts: ['a backpack', 'a school backpack'],
    ru: { noun: 'рюкзак', gender: 'm' },
    ky: 'рюкзак',
  },
  {
    id: 'handbag',
    category: 'bags',
    prompts: ['a handbag', "a women's purse", 'a shoulder bag'],
    ru: { noun: 'сумка', gender: 'f' },
    ky: 'сумка',
  },
  {
    id: 'suitcase',
    category: 'bags',
    prompts: ['a suitcase', 'a travel bag'],
    ru: { noun: 'чемодан', gender: 'm' },
    ky: 'чемодан',
  },
  {
    id: 'shopping_bag',
    category: 'bags',
    prompts: ['a plastic shopping bag', 'a paper bag'],
    ru: { noun: 'пакет', gender: 'm' },
    ky: 'пакет',
  },
  // ---- jewellery
  {
    id: 'ring',
    category: 'jewelry',
    prompts: ['a ring', 'a gold ring', 'a wedding ring'],
    ru: { noun: 'кольцо', gender: 'n' },
    ky: 'шакек',
    metal: true,
  },
  {
    id: 'necklace',
    category: 'jewelry',
    prompts: ['a necklace', 'a chain necklace', 'a pendant on a chain'],
    ru: { noun: 'цепочка', gender: 'f' },
    ky: 'чынжыр',
    metal: true,
  },
  {
    id: 'earrings',
    category: 'jewelry',
    prompts: ['earrings', 'a pair of earrings'],
    ru: { noun: 'серьги', gender: 'pl' },
    ky: 'сөйкө',
    metal: true,
  },
  {
    id: 'bracelet',
    category: 'jewelry',
    prompts: ['a bracelet'],
    ru: { noun: 'браслет', gender: 'm' },
    ky: 'билерик',
    metal: true,
  },
  // ---- clothing and accessories
  {
    id: 'jacket',
    category: 'clothing',
    prompts: ['a jacket', 'a coat', 'a hoodie'],
    ru: { noun: 'куртка', gender: 'f' },
    ky: 'куртка',
  },
  {
    id: 'hat',
    category: 'clothing',
    prompts: ['a knit hat', 'a baseball cap', 'a winter hat'],
    ru: { noun: 'шапка', gender: 'f' },
    ky: 'баш кийим',
  },
  {
    id: 'scarf',
    category: 'clothing',
    prompts: ['a scarf'],
    ru: { noun: 'шарф', gender: 'm' },
    ky: 'шарф',
  },
  {
    id: 'gloves',
    category: 'clothing',
    prompts: ['a pair of gloves', 'mittens'],
    ru: { noun: 'перчатки', gender: 'pl' },
    ky: 'кол кап',
  },
  {
    id: 'shoes',
    category: 'clothing',
    prompts: ['shoes', 'sneakers', 'boots'],
    ru: { noun: 'обувь', gender: 'f' },
    ky: 'бут кийим',
  },
  {
    id: 'umbrella',
    category: 'clothing',
    prompts: ['an umbrella', 'a folded umbrella'],
    ru: { noun: 'зонт', gender: 'm' },
    ky: 'кол чатыр',
  },
  // ---- glasses
  {
    id: 'glasses',
    category: 'glasses',
    prompts: ['eyeglasses', 'glasses with a frame', 'an eyeglasses case'],
    ru: { noun: 'очки', gender: 'pl' },
    ky: 'көз айнек',
  },
  {
    id: 'sunglasses',
    category: 'glasses',
    prompts: ['sunglasses'],
    ru: { noun: 'солнцезащитные очки', gender: 'pl' },
    ky: 'күн көз айнеги',
  },
  // ---- pets
  {
    id: 'cat',
    category: 'pets',
    prompts: ['a cat', 'a kitten'],
    ru: { noun: 'кошка', gender: 'f' },
    ky: 'мышык',
  },
  {
    id: 'dog',
    category: 'pets',
    prompts: ['a dog', 'a puppy'],
    ru: { noun: 'собака', gender: 'f' },
    ky: 'ит',
  },
  // ---- children
  {
    id: 'toy',
    category: 'toys',
    prompts: ['a teddy bear', 'a plush toy', "a children's toy"],
    ru: { noun: 'игрушка', gender: 'f' },
    ky: 'оюнчук',
  },
  {
    id: 'stroller',
    category: 'toys',
    prompts: ['a baby stroller'],
    ru: { noun: 'коляска', gender: 'f' },
    ky: 'коляска',
  },
  // ---- transport
  {
    id: 'bicycle',
    category: 'transport',
    prompts: ['a bicycle'],
    ru: { noun: 'велосипед', gender: 'm' },
    ky: 'велосипед',
  },
  {
    id: 'scooter',
    category: 'transport',
    prompts: ['a kick scooter', 'an electric scooter'],
    ru: { noun: 'самокат', gender: 'm' },
    ky: 'самокат',
  },
  {
    id: 'helmet',
    category: 'transport',
    prompts: ['a bicycle helmet', 'a motorcycle helmet'],
    ru: { noun: 'шлем', gender: 'm' },
    ky: 'шлем',
  },
  // ---- other
  {
    id: 'book',
    category: 'other',
    prompts: ['a book', 'a notebook with a cover'],
    ru: { noun: 'книга', gender: 'f' },
    ky: 'китеп',
  },
  {
    id: 'bottle',
    category: 'other',
    prompts: ['a water bottle', 'a thermos'],
    ru: { noun: 'бутылка', gender: 'f' },
    ky: 'бөтөлкө',
  },
  // ---- not an item: these soak up probability so that a street or a selfie
  //      does not get forced into some category.
  {
    id: 'person',
    category: null,
    prompts: ['a person', 'a portrait of a person', 'a group of people'],
  },
  {
    id: 'scene',
    category: null,
    prompts: ['a room interior', 'a street', 'a landscape', 'a shop interior'],
  },
  {
    id: 'blank',
    category: null,
    prompts: ['a blank wall', 'a blurry photo', 'a dark photo', 'a plain surface'],
  },
];

/** Templates the prompts are wrapped in; the embeddings are averaged over them. */
export const PROMPT_TEMPLATES = ['a photo of {}.', 'a close-up photo of {}.', '{} on a table.'];

/**
 * Brands told apart by look alone, per label. The first entry is the generic item:
 * a brand is suggested only when it clearly beats it.
 */
export const BRAND_PROMPTS: Record<string, { brand: string | null; prompt: string }[]> = {
  smartphone: [
    { brand: null, prompt: 'a smartphone' },
    { brand: null, prompt: 'an Android smartphone' },
    { brand: 'Apple iPhone', prompt: 'an Apple iPhone' },
    { brand: 'Samsung', prompt: 'a Samsung Galaxy smartphone' },
    { brand: 'Xiaomi', prompt: 'a Xiaomi Redmi smartphone' },
    { brand: 'Huawei', prompt: 'a Huawei smartphone' },
  ],
  earbuds: [
    { brand: null, prompt: 'wireless earbuds' },
    { brand: null, prompt: 'cheap no-name wireless earbuds' },
    { brand: 'Apple AirPods', prompt: 'Apple AirPods in a white charging case' },
    { brand: 'Samsung Galaxy Buds', prompt: 'Samsung Galaxy Buds' },
  ],
  laptop: [
    { brand: null, prompt: 'a laptop computer' },
    { brand: null, prompt: 'a Windows laptop' },
    { brand: 'Lenovo', prompt: 'a Lenovo ThinkPad laptop' },
    { brand: 'Apple MacBook', prompt: 'an Apple MacBook' },
  ],
  tablet: [
    { brand: null, prompt: 'a tablet computer' },
    { brand: null, prompt: 'a Microsoft Surface tablet with a keyboard cover' },
    { brand: 'Samsung', prompt: 'a Samsung Galaxy Tab tablet' },
    { brand: 'Apple iPad', prompt: 'an Apple iPad' },
  ],
  watch: [
    { brand: null, prompt: 'a wristwatch' },
    { brand: 'Apple Watch', prompt: 'an Apple Watch' },
  ],
};

/** Colour prompts, used to double-check the pixel-based colour. */
export const COLOR_PROMPTS: Record<ColorKey, string> = {
  black: 'black',
  white: 'white',
  gray: 'gray',
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
  multicolor: 'multicoloured',
};
export const COLOR_TEMPLATES = ['a photo of a {} object.', 'a {} item.'];

// ---------------------------------------------------------------- titles

const RU_COLOR: Record<ColorKey, [string, string, string, string]> = {
  black: ['чёрный', 'чёрная', 'чёрное', 'чёрные'],
  white: ['белый', 'белая', 'белое', 'белые'],
  gray: ['серый', 'серая', 'серое', 'серые'],
  red: ['красный', 'красная', 'красное', 'красные'],
  orange: ['оранжевый', 'оранжевая', 'оранжевое', 'оранжевые'],
  yellow: ['жёлтый', 'жёлтая', 'жёлтое', 'жёлтые'],
  green: ['зелёный', 'зелёная', 'зелёное', 'зелёные'],
  blue: ['синий', 'синяя', 'синее', 'синие'],
  purple: ['фиолетовый', 'фиолетовая', 'фиолетовое', 'фиолетовые'],
  pink: ['розовый', 'розовая', 'розовое', 'розовые'],
  brown: ['коричневый', 'коричневая', 'коричневое', 'коричневые'],
  beige: ['бежевый', 'бежевая', 'бежевое', 'бежевые'],
  gold: ['золотистый', 'золотистая', 'золотистое', 'золотистые'],
  silver: ['серебристый', 'серебристая', 'серебристое', 'серебристые'],
  multicolor: ['разноцветный', 'разноцветная', 'разноцветное', 'разноцветные'],
};

const KY_COLOR: Record<ColorKey, string> = {
  black: 'кара',
  white: 'ак',
  gray: 'боз',
  red: 'кызыл',
  orange: 'кызгылт сары',
  yellow: 'сары',
  green: 'жашыл',
  blue: 'көк',
  purple: 'кочкул көк',
  pink: 'кызгылт',
  brown: 'күрөң',
  beige: 'беж түстүү',
  gold: 'алтын түстүү',
  silver: 'күмүш түстүү',
  multicolor: 'ар түстүү',
};

const GENDER_INDEX: Record<Gender, number> = { m: 0, f: 1, n: 2, pl: 3 };
const RU_VERB = {
  FOUND: ['Найден', 'Найдена', 'Найдено', 'Найдены'],
  LOST: ['Потерян', 'Потеряна', 'Потеряно', 'Потеряны'],
} as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Apple iPhone" → brand "Apple", model "iPhone"; "Samsung" → brand only. */
export function splitBrand(value: string): { brand: string; model: string | null } {
  const [brand, ...rest] = value.split(' ');
  return { brand, model: rest.length ? rest.join(' ') : null };
}

/**
 * "Найдена чёрная сумка" / "Кара сумка табылды". A recognised model replaces the
 * generic noun ("Найден зелёный iPhone"); a bare brand follows it ("телефон Samsung").
 */
export function localTitles(
  label: LocalLabel,
  color: ColorKey | null,
  listingType: 'LOST' | 'FOUND',
  brand: string | null = null,
): { ru: string | null; ky: string | null } {
  const parts = brand ? splitBrand(brand) : null;
  let ru: string | null = null;
  if (label.ru) {
    const g = GENDER_INDEX[label.ru.gender];
    const adjective = color ? `${RU_COLOR[color][g]} ` : '';
    const noun = parts?.model ?? (parts ? `${label.ru.noun} ${parts.brand}` : label.ru.noun);
    ru = `${RU_VERB[listingType][g]} ${adjective}${noun}`;
  }
  let ky: string | null = null;
  if (label.ky) {
    const verb = listingType === 'LOST' ? 'жоголду' : 'табылды';
    const noun = parts?.model ?? (parts ? `${parts.brand} ${label.ky}` : label.ky);
    ky = capitalize(`${color ? KY_COLOR[color] + ' ' : ''}${noun} ${verb}`);
  }
  return { ru, ky };
}
