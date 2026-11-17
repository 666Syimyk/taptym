import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * On-device image encoder (MobileCLIP-S0 image tower, fp32, 45.5 MB, Apple Sample
 * Code License). It turns a photo into a 512-number vector; comparing that vector
 * with precomputed vectors of text labels gives zero-shot recognition.
 *
 * The int8 variant is four times smaller but useless here: a two-pixel shift
 * changes its output beyond recognition (4/23 correct on the sample set vs 23/23).
 *
 * The weights are not in git. They are fetched once, verified by SHA-256, and kept
 * in AI_LOCAL_MODEL_DIR. Everything here fails soft: no model → no category, and the
 * rest of the pipeline (colour, safety review) carries on.
 */
export const VISION_MODEL = {
  name: 'mobileclip_s0',
  file: 'mobileclip_s0_vision.onnx',
  size: 45_543_630,
  sha256: '17d3c037b1d488c10c50e09f6009ea5a198caef4e0e8f4ea5617b7cb2d067ac0',
  url: 'https://huggingface.co/Xenova/mobileclip_s0/resolve/757d59c9c6870a76a4b0306f05f5061bca15c39f/onnx/vision_model.onnx',
  /** Shortest edge resized to this, then centre-cropped to a square; pixels 0..1, no mean/std. */
  inputSize: 256,
} as const;

export type ModelState = 'missing' | 'downloading' | 'loading' | 'ready' | 'error';

type Ort = typeof import('onnxruntime-node');
type Session = import('onnxruntime-node').InferenceSession;

export async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

/** Pixels → CHW float32 tensor data, exactly as the model was trained to see them. */
export async function toModelInput(image: Buffer, size: number = VISION_MODEL.inputSize) {
  const { data } = await sharp(image, { failOn: 'error' })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'cover', position: 'centre', kernel: 'linear' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const plane = size * size;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    out[i] = data[i * 3] / 255;
    out[plane + i] = data[i * 3 + 1] / 255;
    out[2 * plane + i] = data[i * 3 + 2] / 255;
  }
  return out;
}

export function normalize(v: ArrayLike<number>): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

export class VisionModel {
  private session: Promise<Session> | null = null;
  private ort: Ort | null = null;
  state: ModelState = 'missing';
  lastError: string | null = null;

  constructor(private readonly dir: string) {}

  get file() {
    return path.resolve(this.dir, VISION_MODEL.file);
  }

  available(): boolean {
    return existsSync(this.file);
  }

  /** Loads once; concurrent callers share the same promise. */
  private load(): Promise<Session> {
    if (!this.session) {
      this.state = 'loading';
      this.session = (async () => {
        this.ort ??= await import('onnxruntime-node');
        const session = await this.ort.InferenceSession.create(this.file, {
          executionProviders: ['cpu'],
          graphOptimizationLevel: 'all',
          intraOpNumThreads: 2,
        });
        this.state = 'ready';
        return session;
      })().catch((e: Error) => {
        this.state = 'error';
        this.lastError = e.message;
        this.session = null;
        throw e;
      });
    }
    return this.session;
  }

  /** Warms the model up so the first person does not wait for loading. */
  async preload(): Promise<boolean> {
    if (!this.available()) return false;
    try {
      await this.load();
      return true;
    } catch {
      return false;
    }
  }

  /** L2-normalised image embedding, or null when the model is not there. */
  async embed(image: Buffer): Promise<Float32Array | null> {
    if (!this.available()) return null;
    const session = await this.load();
    const input = await toModelInput(image);
    const size = VISION_MODEL.inputSize;
    const tensor = new this.ort!.Tensor('float32', input, [1, 3, size, size]);
    const result = await session.run({ [session.inputNames[0]]: tensor });
    const output = result['image_embeds'] ?? result[session.outputNames[0]];
    return normalize(output.data as Float32Array);
  }

  async verify(): Promise<boolean> {
    if (!this.available()) return false;
    const stat = await fs.stat(this.file);
    if (stat.size !== VISION_MODEL.size) return false;
    return (await sha256File(this.file)) === VISION_MODEL.sha256;
  }
}
