/**
 * Reference data: categories (ru/ky + synonyms + publication policy) and approximate
 * locations (Kyrgyzstan → cities → districts). Idempotent: inserts only missing rows.
 */
import { and, eq, isNull } from 'drizzle-orm';
import type { AppDb } from './database.module';
import { categories, locations, featureFlags } from './schema';

export const CATEGORY_SEED = [
  {
    slug: 'wallets',
    nameRu: 'Кошельки',
    nameKy: 'Капчыктар',
    nameEn: 'Wallets',
    icon: 'wallet',
    synonyms: ['кошелек', 'кошелёк', 'портмоне', 'капчык', 'бумажник'],
    sortOrder: 10,
  },
  {
    slug: 'documents',
    nameRu: 'Документы',
    nameKy: 'Документтер',
    nameEn: 'Documents',
    icon: 'id-card',
    sensitive: true,
    publicationPolicy: 'restricted_photo',
    synonyms: [
      'паспорт',
      'документ',
      'права',
      'удостоверение',
      'ид',
      'id',
      'студенческий',
      'паспорт',
      'күбөлүк',
    ],
    sortOrder: 20,
  },
  {
    slug: 'bank_cards',
    nameRu: 'Банковские карты',
    nameKy: 'Банк карталары',
    nameEn: 'Bank cards',
    icon: 'credit-card',
    sensitive: true,
    publicationPolicy: 'restricted_photo',
    synonyms: [
      'карта',
      'банковская карта',
      'карточка',
      'visa',
      'элкарт',
      'mastercard',
      'банк картасы',
    ],
    sortOrder: 30,
  },
  {
    slug: 'phones',
    nameRu: 'Телефоны',
    nameKy: 'Телефондор',
    nameEn: 'Phones',
    icon: 'smartphone',
    sensitive: true,
    synonyms: [
      'телефон',
      'смартфон',
      'айфон',
      'iphone',
      'samsung',
      'xiaomi',
      'redmi',
      'мобильник',
      'телефон',
    ],
    sortOrder: 40,
  },
  {
    slug: 'electronics',
    nameRu: 'Электроника',
    nameKy: 'Электроника',
    nameEn: 'Electronics',
    icon: 'headphones',
    synonyms: [
      'наушники',
      'airpods',
      'планшет',
      'ноутбук',
      'часы',
      'смарт-часы',
      'зарядка',
      'повербанк',
      'кулакчын',
      'саат',
    ],
    sortOrder: 50,
  },
  {
    slug: 'keys',
    nameRu: 'Ключи',
    nameKy: 'Ачкычтар',
    nameEn: 'Keys',
    icon: 'key',
    sensitive: true,
    publicationPolicy: 'restricted_photo',
    synonyms: ['ключ', 'ключи', 'брелок', 'ачкыч', 'ачкычтар'],
    sortOrder: 60,
  },
  {
    slug: 'bags',
    nameRu: 'Сумки и рюкзаки',
    nameKy: 'Сумкалар жана рюкзактар',
    nameEn: 'Bags and backpacks',
    icon: 'backpack',
    synonyms: ['сумка', 'рюкзак', 'портфель', 'пакет', 'чемодан', 'баштык', 'сумка'],
    sortOrder: 70,
  },
  {
    slug: 'jewelry',
    nameRu: 'Украшения',
    nameKy: 'Зер буюмдар',
    nameEn: 'Jewelry',
    icon: 'gem',
    sensitive: true,
    synonyms: ['кольцо', 'серьги', 'цепочка', 'браслет', 'шакек', 'сөйкө', 'украшение'],
    sortOrder: 80,
  },
  {
    slug: 'clothing',
    nameRu: 'Одежда и аксессуары',
    nameKy: 'Кийим жана аксессуарлар',
    nameEn: 'Clothing and accessories',
    icon: 'shirt',
    synonyms: [
      'куртка',
      'шапка',
      'шарф',
      'перчатки',
      'кепка',
      'зонт',
      'кийим',
      'калпак',
      'кол кап',
    ],
    sortOrder: 90,
  },
  {
    slug: 'glasses',
    nameRu: 'Очки',
    nameKy: 'Көз айнектер',
    nameEn: 'Glasses',
    icon: 'glasses',
    synonyms: ['очки', 'солнцезащитные', 'көз айнек'],
    sortOrder: 100,
  },
  {
    slug: 'pets',
    nameRu: 'Домашние животные',
    nameKy: 'Үй жаныбарлары',
    nameEn: 'Pets',
    icon: 'paw',
    synonyms: ['кошка', 'собака', 'кот', 'щенок', 'котёнок', 'мышык', 'ит', 'жаныбар'],
    sortOrder: 110,
  },
  {
    slug: 'toys',
    nameRu: 'Детские вещи и игрушки',
    nameKy: 'Балдар буюмдары',
    nameEn: "Kids' items and toys",
    icon: 'teddy-bear',
    synonyms: ['игрушка', 'коляска', 'соска', 'оюнчук', 'бала'],
    sortOrder: 120,
  },
  {
    slug: 'transport',
    nameRu: 'Транспорт и аксессуары',
    nameKy: 'Транспорт жана аксессуарлар',
    nameEn: 'Transport and accessories',
    icon: 'bike',
    synonyms: ['велосипед', 'самокат', 'шлем', 'велик', 'велосипед'],
    sortOrder: 130,
  },
  {
    slug: 'other',
    nameRu: 'Другое',
    nameKy: 'Башка',
    nameEn: 'Other',
    icon: 'tag',
    synonyms: ['другое', 'башка'],
    sortOrder: 999,
  },
] as const;

interface LocSeed {
  key: string;
  parentKey: string | null;
  kind: 'country' | 'city' | 'district';
  nameRu: string;
  nameKy: string;
  nameEn: string;
  lat?: number;
  lng?: number;
  sortOrder?: number;
}

export const LOCATION_SEED: LocSeed[] = [
  {
    key: 'kg',
    parentKey: null,
    kind: 'country',
    nameRu: 'Кыргызстан',
    nameKy: 'Кыргызстан',
    nameEn: 'Kyrgyzstan',
    sortOrder: 0,
  },
  {
    key: 'bishkek',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Бишкек',
    nameKy: 'Бишкек',
    nameEn: 'Bishkek',
    lat: 42.8746,
    lng: 74.5698,
    sortOrder: 1,
  },
  {
    key: 'bishkek_pervomay',
    parentKey: 'bishkek',
    kind: 'district',
    nameRu: 'Первомайский район',
    nameKy: 'Биринчи май району',
    nameEn: 'Pervomaisky district',
    lat: 42.88,
    lng: 74.62,
  },
  {
    key: 'bishkek_sverdlov',
    parentKey: 'bishkek',
    kind: 'district',
    nameRu: 'Свердловский район',
    nameKy: 'Свердлов району',
    nameEn: 'Sverdlovsky district',
    lat: 42.86,
    lng: 74.64,
  },
  {
    key: 'bishkek_lenin',
    parentKey: 'bishkek',
    kind: 'district',
    nameRu: 'Ленинский район',
    nameKy: 'Ленин району',
    nameEn: 'Leninsky district',
    lat: 42.85,
    lng: 74.56,
  },
  {
    key: 'bishkek_oktyabr',
    parentKey: 'bishkek',
    kind: 'district',
    nameRu: 'Октябрьский район',
    nameKy: 'Октябрь району',
    nameEn: 'Oktyabrsky district',
    lat: 42.84,
    lng: 74.6,
  },
  {
    key: 'osh',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Ош',
    nameKy: 'Ош',
    nameEn: 'Osh',
    lat: 40.5283,
    lng: 72.7985,
    sortOrder: 2,
  },
  {
    key: 'osh_center',
    parentKey: 'osh',
    kind: 'district',
    nameRu: 'Центр',
    nameKy: 'Борбор',
    nameEn: 'Center',
    lat: 40.53,
    lng: 72.8,
  },
  {
    key: 'osh_other',
    parentKey: 'osh',
    kind: 'district',
    nameRu: 'Другие районы',
    nameKy: 'Башка райондор',
    nameEn: 'Other districts',
    lat: 40.5,
    lng: 72.8,
  },
  {
    key: 'jalalabad',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Джалал-Абад',
    nameKy: 'Жалал-Абад',
    nameEn: 'Jalal-Abad',
    lat: 40.9333,
    lng: 73.0,
    sortOrder: 3,
  },
  {
    key: 'karakol',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Каракол',
    nameKy: 'Каракол',
    nameEn: 'Karakol',
    lat: 42.4907,
    lng: 78.3936,
    sortOrder: 4,
  },
  {
    key: 'tokmok',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Токмок',
    nameKy: 'Токмок',
    nameEn: 'Tokmok',
    lat: 42.8417,
    lng: 75.3011,
    sortOrder: 5,
  },
  {
    key: 'naryn',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Нарын',
    nameKy: 'Нарын',
    nameEn: 'Naryn',
    lat: 41.4287,
    lng: 75.9911,
    sortOrder: 6,
  },
  {
    key: 'talas',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Талас',
    nameKy: 'Талас',
    nameEn: 'Talas',
    lat: 42.5228,
    lng: 72.2426,
    sortOrder: 7,
  },
  {
    key: 'batken',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Баткен',
    nameKy: 'Баткен',
    nameEn: 'Batken',
    lat: 40.0628,
    lng: 70.8184,
    sortOrder: 8,
  },
  {
    key: 'cholpon_ata',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Чолпон-Ата',
    nameKy: 'Чолпон-Ата',
    nameEn: 'Cholpon-Ata',
    lat: 42.6497,
    lng: 77.0828,
    sortOrder: 9,
  },
  {
    key: 'kg_other',
    parentKey: 'kg',
    kind: 'city',
    nameRu: 'Другой населённый пункт',
    nameKy: 'Башка жер',
    nameEn: 'Other town',
    sortOrder: 99,
  },
];

export async function seedReferenceData(db: AppDb): Promise<void> {
  const existing = await db.select({ slug: categories.slug }).from(categories);
  const have = new Set(existing.map((c) => c.slug));
  for (const c of CATEGORY_SEED) {
    if (have.has(c.slug)) {
      // Rows seeded before English existed get their English name once.
      await db
        .update(categories)
        .set({ nameEn: c.nameEn })
        .where(and(eq(categories.slug, c.slug), isNull(categories.nameEn)));
      continue;
    }
    await db.insert(categories).values({
      slug: c.slug,
      nameRu: c.nameRu,
      nameKy: c.nameKy,
      nameEn: c.nameEn,
      icon: c.icon,
      synonyms: [...c.synonyms],
      sensitive: 'sensitive' in c ? Boolean(c.sensitive) : false,
      publicationPolicy: 'publicationPolicy' in c ? String(c.publicationPolicy) : 'standard',
      sortOrder: c.sortOrder,
    });
  }

  // Locations: resolve parents by a stable (kind, nameRu) lookup.
  const byKey = new Map<string, string>();
  const existingLocs = await db.select().from(locations);
  const find = (s: LocSeed) => existingLocs.find((l) => l.kind === s.kind && l.nameRu === s.nameRu);
  for (const s of LOCATION_SEED) {
    const found = find(s);
    if (found) {
      byKey.set(s.key, found.id);
      if (!found.nameEn)
        await db.update(locations).set({ nameEn: s.nameEn }).where(eq(locations.id, found.id));
      continue;
    }
    const [row] = await db
      .insert(locations)
      .values({
        parentId: s.parentKey ? (byKey.get(s.parentKey) ?? null) : null,
        kind: s.kind,
        nameRu: s.nameRu,
        nameKy: s.nameKy,
        nameEn: s.nameEn,
        centerLat: s.lat?.toString(),
        centerLng: s.lng?.toString(),
        sortOrder: s.sortOrder ?? 100,
      })
      .returning({ id: locations.id });
    byKey.set(s.key, row.id);
  }

  const flags = [
    { key: 'qr_handoff', enabled: false, description: 'P1: one-time QR confirmation of handoff' },
    { key: 'saved_searches', enabled: false, description: 'P1: saved searches' },
    { key: 'image_search', enabled: false, description: 'P1: visual similarity search' },
  ];
  for (const f of flags) {
    const [row] = await db.select().from(featureFlags).where(eq(featureFlags.key, f.key));
    if (!row) await db.insert(featureFlags).values(f);
  }
}
