import type {
  AiProvider,
  AiStatus,
  AnalyzeContext,
  ImageAnalysis,
  SensitiveCheck,
} from './ai.provider';
import type { LocalAiProvider } from './local/local.provider';

/** Fields of the remote answer win; the local answer fills what it left empty. */
export function mergeAnalyses(
  remote: ImageAnalysis | null,
  local: ImageAnalysis | null,
): ImageAnalysis | null {
  if (!remote) return local;
  if (!local) return { ...remote, source: 'anthropic' };
  const pick = <K extends keyof ImageAnalysis>(key: K) => remote[key] ?? local[key];
  return {
    categorySlug: pick('categorySlug'),
    color: pick('color'),
    brand: pick('brand'),
    model: remote.brand ? remote.model : pick('model'),
    // A title must match the category and colour it names, so it comes as a set.
    titleRu: remote.titleRu ?? (remote.categorySlug ? null : local.titleRu),
    titleKy: remote.titleKy ?? (remote.categorySlug ? null : local.titleKy),
    descriptionRu: pick('descriptionRu'),
    descriptionKy: pick('descriptionKy'),
    confidence: remote.categorySlug ? remote.confidence : local.confidence,
    quality: remote.quality === 'unknown' ? local.quality : remote.quality,
    source: 'anthropic',
  };
}

/**
 * Claude (when a key is configured) plus on-device recognition, run side by side.
 * A failed, slow or refused remote call never leaves the person with an empty form.
 */
export class CompositeAiProvider implements AiProvider {
  readonly enabled = true;

  constructor(
    private readonly remote: AiProvider | null,
    readonly local: LocalAiProvider,
  ) {}

  get name() {
    return this.remote ? `${this.remote.name}+local` : 'local';
  }

  status(): AiStatus {
    return { ...this.local.status(), provider: this.name };
  }

  start() {
    this.local.start();
  }

  shutdown() {
    this.local.shutdown();
  }

  async analyzeImage(image: Buffer, mimeType: string, ctx: AnalyzeContext) {
    const [remote, local] = await Promise.all([
      this.remote ? this.remote.analyzeImage(image, mimeType, ctx).catch(() => null) : null,
      this.local.analyzeImage(image, mimeType, ctx).catch(() => null),
    ]);
    return mergeAnalyses(remote, local);
  }

  /**
   * Claude reads text and sees faces, so its verdict is final when it gives one.
   * Without it, the local check can only block the obvious; the rest goes to review.
   */
  async checkSensitive(image: Buffer, mimeType: string): Promise<SensitiveCheck> {
    const [remote, local] = await Promise.all([
      this.remote ? this.remote.checkSensitive(image, mimeType).catch(() => null) : null,
      this.local.checkSensitive(image),
    ]);
    if (remote && remote.status !== 'unavailable') return remote;
    return local;
  }
}
