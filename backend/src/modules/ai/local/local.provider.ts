import { Logger } from '@nestjs/common';
import type { ColorKey } from '../../../common/text';
import type {
  AiProvider,
  AiStatus,
  AnalyzeContext,
  ImageAnalysis,
  SensitiveCheck,
} from '../ai.provider';
import { analyzeColors, type ColorAnalysis } from './color-analysis';
import { LabelIndex } from './label-index';
import { localTitles, splitBrand, type LocalLabel } from './labels';
import { downloadVerified } from './model-download';
import { VISION_MODEL, VisionModel } from './vision-model';

/** Below this the category is not suggested at all. */
export const CATEGORY_MIN = 0.35;
/** A ready title (and brand) only when the item itself is clear. */
export const TITLE_MIN = 0.5;
/** A sensitive label this sure keeps the photo off the public listing. */
export const SENSITIVE_MIN = 0.6;
const COLOR_MIN = 0.25;

const GOLD: ReadonlySet<ColorKey> = new Set(['yellow', 'orange', 'beige', 'brown', 'gold']);
const SILVER: ReadonlySet<ColorKey> = new Set(['gray', 'white', 'silver']);

/**
 * Picks the colour people would name. Pixels are reliable for black, white and
 * grey; the model understands what the item is and knows green phones and gold
 * rings. Exported for tests.
 */
export function pickColor(
  pixels: Pick<ColorAnalysis, 'color' | 'confidence'> | null,
  model: { color: ColorKey; probability: number }[] | null,
  label: LocalLabel | null,
): { color: ColorKey; confidence: number } | null {
  const top = model?.[0] ?? null;
  if (label?.metal) {
    if (top && (top.color === 'gold' || top.color === 'silver') && top.probability >= 0.4)
      return { color: top.color, confidence: top.probability };
    if (pixels?.color && GOLD.has(pixels.color))
      return { color: 'gold', confidence: pixels.confidence };
    if (pixels?.color && SILVER.has(pixels.color))
      return { color: 'silver', confidence: pixels.confidence };
  }
  if (top && top.probability >= 0.9 && top.color !== 'multicolor')
    return { color: top.color, confidence: top.probability };
  if (pixels?.color) {
    // Dark items photographed in daylight look grey pixel by pixel.
    if (pixels.color === 'gray' && top?.color === 'black' && top.probability >= 0.35)
      return { color: 'black', confidence: top.probability };
    return { color: pixels.color, confidence: pixels.confidence };
  }
  if (top && top.probability >= 0.6) return { color: top.color, confidence: top.probability };
  return null;
}

/**
 * Recognition that runs on this server with no API key and no network:
 * category, colour, recognisable brands and a ready title in Russian and Kyrgyz.
 *
 * It cannot read text or find faces, so it never declares a photo safe: its
 * safety check either blocks an obvious document/card/key or leaves the photo to
 * human review.
 */
export class LocalAiProvider implements AiProvider {
  readonly name = 'local';
  readonly enabled = true;
  private readonly logger = new Logger('AI');
  private readonly index = new LabelIndex();
  private readonly embeddings = new WeakMap<Buffer, Promise<Float32Array | null>>();
  private download: Promise<boolean> | null = null;
  private readonly stop = new AbortController();

  constructor(
    readonly model: VisionModel,
    private readonly opts: { autoDownload: boolean; url?: string } = { autoDownload: false },
  ) {
    if (this.index.stale)
      this.logger.warn('label-embeddings.json is out of date: run scripts/build-ai-labels.ts');
  }

  status(): AiStatus {
    return {
      provider: this.name,
      recognition: this.model.available()
        ? this.model.state === 'missing'
          ? 'loading'
          : this.model.state
        : this.download
          ? 'downloading'
          : 'missing',
    };
  }

  /** Verifies or fetches the model in the background, then warms it up. */
  start(): void {
    void (async () => {
      if (this.model.available()) {
        if (!(await this.model.verify())) {
          this.logger.warn('Local AI model file is damaged; it will be downloaded again');
          await import('node:fs').then((fs) => fs.promises.rm(this.model.file, { force: true }));
        }
      }
      if (!this.model.available() && this.opts.autoDownload) {
        this.logger.log(
          `Downloading the local recognition model (${Math.round(VISION_MODEL.size / 1e6)} MB, once)`,
        );
        this.download = downloadVerified(
          {
            url: this.opts.url ?? VISION_MODEL.url,
            file: this.model.file,
            size: VISION_MODEL.size,
            sha256: VISION_MODEL.sha256,
          },
          { log: (m) => this.logger.log(m), signal: this.stop.signal },
        );
        const ok = await this.download;
        this.download = null;
        if (!ok) {
          this.logger.warn(
            'Local recognition model is not available; colour still works. Retry with `npm run ai:model`.',
          );
          return;
        }
      }
      if (await this.model.preload()) this.logger.log('Local recognition model ready');
      else if (this.model.available())
        this.logger.warn(`Local recognition model failed to load: ${this.model.lastError}`);
      else
        this.logger.warn(
          'Local recognition model not found: categories are not suggested. Run `npm run ai:model`.',
        );
    })().catch((e: Error) => this.logger.warn(`Local AI start failed: ${e.message}`));
  }

  shutdown(): void {
    this.stop.abort();
  }

  /** One model run per photo even though analysis and safety ask in parallel. */
  private embedding(image: Buffer): Promise<Float32Array | null> {
    let pending = this.embeddings.get(image);
    if (!pending) {
      pending = this.model.embed(image).catch((e: Error) => {
        this.logger.warn(`Local recognition failed: ${e.message}`);
        return null;
      });
      this.embeddings.set(image, pending);
    }
    return pending;
  }

  async analyzeImage(
    image: Buffer,
    _mimeType: string,
    ctx: AnalyzeContext,
  ): Promise<ImageAnalysis | null> {
    const [pixels, embedding] = await Promise.all([
      analyzeColors(image).catch(() => null),
      this.embedding(image),
    ]);
    if (!pixels && !embedding) return null;

    const active = ctx.categories.length ? new Set(ctx.categories.map((c) => c.slug)) : undefined;
    const labels = embedding ? this.index.classify(embedding) : [];
    const best = embedding ? this.index.categories(labels, active)[0] : undefined;
    const category = best && best.probability >= CATEGORY_MIN ? best : null;
    const label = category?.label ?? null;

    const picked = pickColor(pixels, embedding ? this.index.colorScores(embedding) : null, label);
    const color = picked && picked.confidence >= COLOR_MIN ? picked.color : null;
    const sure = !!category && category.probability >= TITLE_MIN;
    const brand = sure && label && embedding ? this.index.brand(embedding, label.id) : null;
    const titles = sure && label ? localTitles(label, color, ctx.listingType, brand) : null;
    const parts = brand ? splitBrand(brand) : null;

    return {
      categorySlug: category?.slug ?? null,
      color,
      brand: parts?.brand ?? null,
      model: parts?.model ?? null,
      titleRu: titles?.ru ?? null,
      titleKy: titles?.ky ?? null,
      descriptionRu: null,
      descriptionKy: null,
      confidence: category ? Math.round(category.probability * 100) / 100 : 0,
      quality: pixels?.quality ?? 'unknown',
      source: 'local',
    };
  }

  async checkSensitive(image: Buffer): Promise<SensitiveCheck> {
    const embedding = await this.embedding(image);
    if (embedding) {
      const top = this.index.classify(embedding)[0];
      if (top?.label.sensitive && top.probability >= SENSITIVE_MIN)
        return { status: 'blocked', findings: [top.label.sensitive], regions: [] };
    }
    return { status: 'unavailable', findings: [], regions: [] };
  }
}
