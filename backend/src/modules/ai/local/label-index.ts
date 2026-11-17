import { createHash } from 'node:crypto';
import type { ColorKey } from '../../../common/text';
import embeddings from './label-embeddings.json';
import {
  BRAND_PROMPTS,
  COLOR_PROMPTS,
  COLOR_TEMPLATES,
  LOCAL_LABELS,
  PROMPT_TEMPLATES,
  type LocalLabel,
} from './labels';

/** MobileCLIP / CLIP temperature: logits = 100 · cosine. */
const LOGIT_SCALE = 100;

export interface LabelScore {
  label: LocalLabel;
  probability: number;
}

export interface CategoryScore {
  slug: string;
  probability: number;
  /** The most likely label inside that category (used for the title). */
  label: LocalLabel;
}

interface EmbeddingsFile {
  model: string;
  fingerprint: string;
  dim: number;
  labels: Record<string, string>;
  colors: Record<string, string>;
  /** Keyed "labelId:index" in BRAND_PROMPTS order. */
  brands?: Record<string, string>;
}

/** Changes whenever a prompt, template or label id changes → the JSON must be rebuilt. */
export function labelsFingerprint(): string {
  const source = JSON.stringify({
    labels: LOCAL_LABELS.map((l) => [l.id, l.prompts]),
    templates: PROMPT_TEMPLATES,
    colors: COLOR_PROMPTS,
    colorTemplates: COLOR_TEMPLATES,
    brands: BRAND_PROMPTS,
  });
  return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

function decode(b64: string): Float32Array {
  const buf = Buffer.from(b64, 'base64');
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
}

export class LabelIndex {
  readonly labels: { label: LocalLabel; vector: Float32Array }[];
  readonly colors: { color: ColorKey; vector: Float32Array }[];
  readonly brands = new Map<string, { brand: string | null; vector: Float32Array }[]>();
  readonly fingerprint: string;
  readonly stale: boolean;

  constructor(file: EmbeddingsFile = embeddings as EmbeddingsFile) {
    this.fingerprint = file.fingerprint;
    this.stale = file.fingerprint !== labelsFingerprint();
    this.labels = LOCAL_LABELS.filter((l) => file.labels[l.id]).map((label) => ({
      label,
      vector: decode(file.labels[label.id]),
    }));
    this.colors = (Object.keys(COLOR_PROMPTS) as ColorKey[])
      .filter((c) => file.colors[c])
      .map((color) => ({ color, vector: decode(file.colors[color]) }));
    for (const [labelId, options] of Object.entries(BRAND_PROMPTS)) {
      const vectors = options.map((o, i) => ({
        brand: o.brand,
        b64: file.brands?.[`${labelId}:${i}`],
      }));
      if (vectors.every((v) => v.b64))
        this.brands.set(
          labelId,
          vectors.map((v) => ({ brand: v.brand, vector: decode(v.b64!) })),
        );
    }
  }

  /** Brand that clearly beats the generic look of the item, or null. */
  brand(image: Float32Array, labelId: string, minProbability = 0.8): string | null {
    const options = this.brands.get(labelId);
    if (!options) return null;
    const probs = softmax(options.map((o) => LOGIT_SCALE * dot(image, o.vector)));
    let best = 0;
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
    return options[best].brand && probs[best] >= minProbability ? options[best].brand : null;
  }

  /** All labels, most likely first. */
  classify(image: Float32Array): LabelScore[] {
    const probs = softmax(this.labels.map((l) => LOGIT_SCALE * dot(image, l.vector)));
    return this.labels
      .map((l, i) => ({ label: l.label, probability: probs[i] }))
      .sort((a, b) => b.probability - a.probability);
  }

  /** Label probabilities summed per category, restricted to categories that exist. */
  categories(scores: LabelScore[], active?: ReadonlySet<string>): CategoryScore[] {
    const bySlug = new Map<string, CategoryScore>();
    for (const s of scores) {
      const slug = s.label.category;
      if (!slug || (active && !active.has(slug))) continue;
      const entry = bySlug.get(slug);
      if (entry) entry.probability += s.probability;
      else bySlug.set(slug, { slug, probability: s.probability, label: s.label });
    }
    return [...bySlug.values()].sort((a, b) => b.probability - a.probability);
  }

  colorScores(image: Float32Array): { color: ColorKey; probability: number }[] {
    const probs = softmax(this.colors.map((c) => LOGIT_SCALE * dot(image, c.vector)));
    return this.colors
      .map((c, i) => ({ color: c.color, probability: probs[i] }))
      .sort((a, b) => b.probability - a.probability);
  }
}
