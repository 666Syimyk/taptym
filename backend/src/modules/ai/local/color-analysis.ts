import sharp from 'sharp';
import type { ColorKey } from '../../../common/text';

/**
 * Colour and photo-quality analysis from pixels alone: no model, no network.
 *
 * The item is assumed to be roughly centred. Colours that ring the frame but are
 * rare in the middle are treated as the backdrop; the remaining pixels are named
 * one by one and counted with a weight that falls off towards the edges.
 */

/** Colours a single pixel can have; gold, silver and multicolour are decided later. */
export type PixelColor = Exclude<ColorKey, 'gold' | 'silver' | 'multicolor'>;

export interface ColorShare {
  color: ColorKey;
  share: number;
}

export interface ColorAnalysis {
  /** Dominant colour of the item, or null when the photo gives no usable signal. */
  color: ColorKey | null;
  /** 0..1 — how clearly the winning colour stands out among the item's pixels. */
  confidence: number;
  palette: ColorShare[];
  quality: 'ok' | 'blurry' | 'dark';
  /** Mean brightness 0..1. */
  brightness: number;
  /** Brightness of the lightest 5% of pixels, 0..1: low only when the whole shot is dark. */
  highlights: number;
  /** Strength of the sharpest edges; low values mean the photo is out of focus. */
  sharpness: number;
}

const SIZE = 96;
const NEUTRAL: ReadonlySet<ColorKey> = new Set(['black', 'white', 'gray']);

/** Neighbouring hues that people rarely call "multicoloured" when they appear together. */
const FAMILY: Record<PixelColor, string> = {
  black: 'neutral',
  white: 'neutral',
  gray: 'neutral',
  red: 'red',
  pink: 'red',
  orange: 'warm',
  brown: 'warm',
  beige: 'warm',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  purple: 'purple',
};

/** Names one sRGB pixel. Exported for tests. */
export function classifyPixel(r: number, g: number, b: number): PixelColor {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const value = max / 255;
  const chroma = (max - min) / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (value < 0.16) return 'black';
  // Saturation alone overstates colour in dark pixels, so chroma has to agree.
  if (saturation < 0.16 || chroma < 0.11) {
    if (luma > 0.8) return 'white';
    if (luma < 0.26) return 'black';
    return 'gray';
  }

  let hue: number;
  if (max === r) hue = ((g - b) / (max - min)) % 6;
  else if (max === g) hue = (b - r) / (max - min) + 2;
  else hue = (r - g) / (max - min) + 4;
  hue = (hue * 60 + 360) % 360;

  if (hue < 18 || hue >= 342) {
    if (luma > 0.68 && saturation < 0.5) return 'pink';
    if (saturation < 0.4 && value < 0.55) return 'brown';
    return 'red';
  }
  if (hue < 46) {
    if (saturation < 0.36 && luma > 0.6) return 'beige';
    if (value < 0.6 || (saturation < 0.55 && luma < 0.52)) return 'brown';
    return 'orange';
  }
  if (hue < 68) {
    if (saturation < 0.38 && luma > 0.58) return 'beige';
    if (value < 0.5) return 'brown';
    return 'yellow';
  }
  if (hue < 165) return 'green';
  if (hue < 258) return 'blue';
  if (hue < 295) return 'purple';
  if (value < 0.45) return 'purple';
  return 'pink';
}

interface Ref {
  y: number;
  cb: number;
  cr: number;
}

function toRef(r: number, g: number, b: number): Ref {
  return {
    y: 0.299 * r + 0.587 * g + 0.114 * b,
    cb: -0.169 * r - 0.331 * g + 0.5 * b,
    cr: 0.5 * r - 0.419 * g - 0.081 * b,
  };
}

/** Lightness counts for less than hue: a shaded backdrop is still the backdrop. */
function distance(p: Ref, ref: Ref): number {
  const dy = (p.y - ref.y) * 0.4;
  return Math.sqrt(dy * dy + (p.cb - ref.cb) ** 2 + (p.cr - ref.cr) ** 2);
}

const BG_DISTANCE = 17;

/** Up to three dominant colours of the frame's border, each with its coverage of it. */
function borderClusters(pixels: Ref[]): { ref: Ref; coverage: number }[] {
  const clusters: { ref: Ref; coverage: number }[] = [];
  let rest = pixels;
  for (let n = 0; n < 3 && rest.length >= pixels.length * 0.15; n++) {
    // Mode seeking on a coarse grid, then a tight cluster around that mode.
    const bins = new Map<string, Ref[]>();
    for (const p of rest) {
      const key = `${Math.round(p.y / 40)}:${Math.round(p.cb / 12)}:${Math.round(p.cr / 12)}`;
      const list = bins.get(key);
      if (list) list.push(p);
      else bins.set(key, [p]);
    }
    let mode: Ref[] = [];
    for (const list of bins.values()) if (list.length > mode.length) mode = list;
    const ref: Ref = {
      y: mode.reduce((s, p) => s + p.y, 0) / mode.length,
      cb: mode.reduce((s, p) => s + p.cb, 0) / mode.length,
      cr: mode.reduce((s, p) => s + p.cr, 0) / mode.length,
    };
    const inside: Ref[] = [];
    const outside: Ref[] = [];
    for (const p of rest) (distance(p, ref) < BG_DISTANCE ? inside : outside).push(p);
    const coverage = inside.length / pixels.length;
    if (coverage < 0.15) break;
    clusters.push({ ref, coverage });
    rest = outside;
  }
  return clusters;
}

/** Works on raw RGB pixels so it can be tested without image files. */
export function analyzePixels(
  data: Uint8Array | Buffer,
  width: number,
  height: number,
): Omit<ColorAnalysis, 'quality' | 'sharpness'> {
  const count = width * height;
  const refs: Ref[] = new Array(count);
  let lumaSum = 0;
  const valueHist = new Uint32Array(256);
  for (let i = 0; i < count; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const p = toRef(r, g, b);
    refs[i] = p;
    lumaSum += p.y / 255;
    valueHist[Math.max(r, g, b)]++;
  }
  const brightness = lumaSum / count;
  // A black wallet filling the frame or a deep-blue bag is not a dark photo:
  // only a shot whose brightest parts are dim is.
  let seen = 0;
  let highlights = 0;
  for (let v = 255; v >= 0; v--) {
    seen += valueHist[v];
    if (seen >= count * 0.05) {
      highlights = v / 255;
      break;
    }
  }

  // 1. Candidate backdrop colours: what the border of the frame is made of.
  const border = Math.max(2, Math.round(Math.min(width, height) * 0.07));
  const borderPixels: Ref[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (x < border || x >= width - border || y < border || y >= height - border)
        borderPixels.push(refs[y * width + x]);
  const clusters = borderClusters(borderPixels);

  // 2. What rings the frame is the backdrop — unless it fills the middle while only
  //    partly touching the border: then it is a large item shot close up.
  const cluster = new Int8Array(count).fill(-1);
  const centre = new Array<number>(clusters.length).fill(0);
  let centreTotal = 0;
  for (let y = 0; y < height; y++) {
    const inY = y >= height * 0.25 && y < height * 0.75;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const inCentre = inY && x >= width * 0.25 && x < width * 0.75;
      if (inCentre) centreTotal++;
      for (let c = 0; c < clusters.length; c++) {
        if (distance(refs[i], clusters[c].ref) < BG_DISTANCE) {
          cluster[i] = c;
          if (inCentre) centre[c]++;
          break;
        }
      }
    }
  }
  const backdrop = clusters.map(
    (k, c) => !(centre[c] / Math.max(1, centreTotal) >= 0.75 && k.coverage <= 0.75),
  );

  // 3. Count named colours, centre-weighted, with and without the backdrop.
  const tally = () => ({
    weights: new Map<PixelColor, number>(),
    total: 0,
    // Neutral pixels are kept as two brightness buckets and named at the end.
    dark: { luma: 0, weight: 0 },
    light: { luma: 0, weight: 0 },
  });
  const all = tally();
  const item = tally();
  for (let y = 0; y < height; y++) {
    const ny = (y / (height - 1 || 1)) * 2 - 1;
    for (let x = 0; x < width; x++) {
      const nx = (x / (width - 1 || 1)) * 2 - 1;
      const i = y * width + x;
      const weight = Math.exp(-(nx * nx + ny * ny) / (2 * 0.55 * 0.55));
      const name = classifyPixel(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
      const isBackdrop = cluster[i] >= 0 && backdrop[cluster[i]];
      const luma = refs[i].y / 255;
      for (const t of isBackdrop ? [all] : [all, item]) {
        t.total += weight;
        if (NEUTRAL.has(name)) {
          const bucket = luma < 0.45 ? t.dark : t.light;
          bucket.luma += luma * weight;
          bucket.weight += weight;
        } else {
          t.weights.set(name, (t.weights.get(name) ?? 0) + weight);
        }
      }
    }
  }

  // Nothing left after removing the backdrop means the frame is one flat surface.
  const used = item.total / all.total >= 0.025 ? item : all;

  // Black things have grey highlights and white things grey shadows, so each
  // brightness bucket is named by its average, not pixel by pixel.
  const add = (name: PixelColor, w: number) =>
    used.weights.set(name, (used.weights.get(name) ?? 0) + w);
  if (used.dark.weight > 0)
    add(used.dark.luma / used.dark.weight < 0.33 ? 'black' : 'gray', used.dark.weight);
  if (used.light.weight > 0)
    add(used.light.luma / used.light.weight > 0.62 ? 'white' : 'gray', used.light.weight);

  const palette: ColorShare[] = [...used.weights.entries()]
    .map(([color, w]) => ({ color: color as ColorKey, share: w / used.total }))
    .sort((a, b) => b.share - a.share);
  if (!palette.length) return { color: null, confidence: 0, palette: [], brightness, highlights };
  return { ...decide(palette), palette: palette.slice(0, 5), brightness, highlights };
}

function decide(palette: ColorShare[]): { color: ColorKey; confidence: number } {
  const top = palette[0];
  const chromatic = palette.filter((p) => !NEUTRAL.has(p.color));
  const chromaticShare = chromatic.reduce((s, p) => s + p.share, 0);

  if (NEUTRAL.has(top.color)) {
    // Highlights and shadows add black, white and grey to every photo. When a real
    // colour covers a good part of the item, that colour is what people would name.
    const best = chromatic[0];
    if (best && chromaticShare >= 0.4 && best.share >= 0.28)
      return withMulticolor(chromatic, best, chromaticShare);
    return { color: top.color, confidence: top.share };
  }
  return withMulticolor(chromatic, top, chromaticShare);
}

function withMulticolor(
  chromatic: ColorShare[],
  best: ColorShare,
  chromaticShare: number,
): { color: ColorKey; confidence: number } {
  // Shares of hue families among the coloured part only.
  const families = new Map<string, number>();
  for (const p of chromatic) {
    const f = FAMILY[p.color as PixelColor];
    families.set(f, (families.get(f) ?? 0) + p.share / chromaticShare);
  }
  const strong = [...families.values()].filter((v) => v >= 0.22).length;
  const bestFamily = families.get(FAMILY[best.color as PixelColor]) ?? 0;
  if (chromaticShare >= 0.45 && (strong >= 3 || (strong === 2 && bestFamily < 0.58)))
    return { color: 'multicolor', confidence: 1 - bestFamily / 2 };
  return { color: best.color, confidence: Math.min(1, best.share / Math.max(chromaticShare, 0.5)) };
}

/** Strength of the sharpest edges (99.5th percentile of the Laplacian), 0..255. */
function edgeStrength(gray: Uint8Array | Buffer, width: number, height: number): number {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = Math.abs(
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width],
      );
      hist[Math.min(255, lap)]++;
      n++;
    }
  }
  let seen = 0;
  const target = n * 0.005;
  for (let v = 255; v >= 0; v--) {
    seen += hist[v];
    if (seen >= target) return v;
  }
  return 0;
}

export const DARK_BELOW = 0.3;
export const BLURRY_BELOW = 14;

export async function analyzeColors(image: Buffer): Promise<ColorAnalysis> {
  const base = sharp(image, { failOn: 'error' }).rotate().flatten({ background: '#ffffff' });
  const small = await base
    .clone()
    .resize(SIZE, SIZE, { fit: 'inside' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const gray = await base
    .clone()
    .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const colors = analyzePixels(small.data, small.info.width, small.info.height);
  const sharpness = edgeStrength(gray.data, gray.info.width, gray.info.height);
  const quality: ColorAnalysis['quality'] =
    colors.highlights < DARK_BELOW ? 'dark' : sharpness < BLURRY_BELOW ? 'blurry' : 'ok';
  return { ...colors, quality, sharpness };
}
