import sharp, { type OverlayOptions } from 'sharp';
import { createHash } from 'node:crypto';

export interface ProcessedImage {
  publicWebp: Buffer; // ≤1280px, EXIF stripped, sensitive regions blurred
  thumbWebp: Buffer; // ≤400px
  width: number;
  height: number;
  contentHash: string;
  perceptualHash: string;
}

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif', 'gif']);

/** Sniffs the real image format (never trusts the client's content-type). */
export async function sniffImage(
  buffer: Buffer,
): Promise<{ format: string; width: number; height: number } | null> {
  try {
    const meta = await sharp(buffer, { failOn: 'error' }).metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format) || !meta.width || !meta.height)
      return null;
    if (meta.width * meta.height > 50_000_000) return null; // decompression bomb guard
    return { format: meta.format, width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

/**
 * Builds safe public variants: auto-rotates by EXIF then drops all metadata
 * (GPS, device, timestamps), resizes, blurs the given regions and re-encodes to WebP.
 */
export async function processImage(
  buffer: Buffer,
  blurRegions: Region[] = [],
): Promise<ProcessedImage> {
  const base = sharp(buffer, { failOn: 'error' }).rotate();
  const meta = await base.metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;

  let pipeline = sharp(buffer, { failOn: 'error' }).rotate();
  if (blurRegions.length > 0 && srcW > 0 && srcH > 0) {
    // Composite heavily blurred crops over each sensitive region.
    const overlays: OverlayOptions[] = [];
    for (const r of blurRegions) {
      const left = Math.max(0, Math.floor(r.x * srcW));
      const top = Math.max(0, Math.floor(r.y * srcH));
      const width = Math.min(srcW - left, Math.ceil(r.w * srcW));
      const height = Math.min(srcH - top, Math.ceil(r.h * srcH));
      if (width <= 0 || height <= 0) continue;
      const patch = await sharp(buffer, { failOn: 'error' })
        .rotate()
        .extract({ left, top, width, height })
        .blur(Math.max(12, Math.round(Math.max(width, height) / 8)))
        .toBuffer();
      overlays.push({ input: patch, left, top });
    }
    if (overlays.length) pipeline = sharp(await pipeline.toBuffer()).composite(overlays);
  }

  const masked = await pipeline.toBuffer();
  const publicWebp = await sharp(masked)
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const thumbWebp = await sharp(masked)
    .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
  const outMeta = await sharp(publicWebp).metadata();

  return {
    publicWebp,
    thumbWebp,
    width: outMeta.width ?? 0,
    height: outMeta.height ?? 0,
    contentHash: createHash('sha256').update(buffer).digest('hex'),
    perceptualHash: await dHash(masked),
  };
}

/**
 * Copy for AI engines: upright, white behind transparency, at most 1568 px (the
 * size vision models work at), JPEG, and with no EXIF/GPS left in it.
 */
export async function prepareForAi(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { failOn: 'error' })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({ width: 1568, height: 1568, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** 64-bit difference hash for near-duplicate detection (PRD §18.4). */
export async function dHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      bits += left > right ? '1' : '0';
    }
  }
  return BigInt('0b' + bits)
    .toString(16)
    .padStart(16, '0');
}

export function hammingDistance(a: string, b: string): number {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let count = 0;
  while (x) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}
