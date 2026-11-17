/**
 * Text normalization for search & matching. Kyrgyz-specific letters are folded to
 * their nearest Russian letters so that "көз айнек" and "коз айнек" both match,
 * and basic Latin transliteration maps "koshelek" → "кошелек".
 */
const KY_FOLD: Record<string, string> = {
  ң: 'н',
  ө: 'о',
  ү: 'у',
  Ң: 'н',
  Ө: 'о',
  Ү: 'у',
  ё: 'е',
  Ё: 'е',
  й: 'и',
};

const LAT_TO_CYR: [RegExp, string][] = [
  [/shch/g, 'щ'],
  [/sh/g, 'ш'],
  [/ch/g, 'ч'],
  [/zh/g, 'ж'],
  [/kh/g, 'х'],
  [/ts/g, 'ц'],
  [/yu/g, 'ю'],
  [/ya/g, 'я'],
  [/yo/g, 'е'],
  [/a/g, 'а'],
  [/b/g, 'б'],
  [/v/g, 'в'],
  [/g/g, 'г'],
  [/d/g, 'д'],
  [/e/g, 'е'],
  [/z/g, 'з'],
  [/i/g, 'и'],
  [/j/g, 'ж'],
  [/k/g, 'к'],
  [/l/g, 'л'],
  [/m/g, 'м'],
  [/n/g, 'н'],
  [/o/g, 'о'],
  [/p/g, 'п'],
  [/r/g, 'р'],
  [/s/g, 'с'],
  [/t/g, 'т'],
  [/u/g, 'у'],
  [/f/g, 'ф'],
  [/h/g, 'х'],
  [/c/g, 'к'],
  [/y/g, 'и'],
  [/w/g, 'в'],
  [/x/g, 'кс'],
  [/q/g, 'к'],
];

export function foldKyrgyz(s: string): string {
  return s.replace(/[ңөүҢӨҮёЁй]/g, (ch) => KY_FOLD[ch] ?? ch);
}

export function normalizeSearchText(s: string): string {
  let out = foldKyrgyz(s.toLowerCase());
  out = out.replace(/[^\p{L}\p{N}\s]+/gu, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

/** Returns normalized variants of a query: as typed and transliterated (if Latin). */
export function queryVariants(q: string): string[] {
  const base = normalizeSearchText(q);
  if (!base) return [];
  const variants = new Set<string>([base]);
  if (/[a-z]/.test(base)) {
    let lat = base;
    for (const [re, cyr] of LAT_TO_CYR) lat = lat.replace(re, cyr);
    variants.add(foldKyrgyz(lat));
  }
  return [...variants];
}

export const COLORS = [
  'black',
  'white',
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'brown',
  'beige',
  'gold',
  'silver',
  'multicolor',
] as const;
export type ColorKey = (typeof COLORS)[number];

export function clampText(s: string | undefined | null, max: number): string {
  if (!s) return '';
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
