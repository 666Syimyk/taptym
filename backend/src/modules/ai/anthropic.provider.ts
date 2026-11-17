import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { COLORS } from '../../common/text';
import { CATEGORY_SEED } from '../../database/seed';
import type {
  AiProvider,
  AnalyzeContext,
  ImageAnalysis,
  SensitiveCheck,
  SensitiveFinding,
} from './ai.provider';

type ImageMedia = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
type Effort = 'low' | 'medium' | 'high';

/** Built per request so categories added in the admin panel are offered too. */
function analysisSchema(slugs: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'categorySlug',
      'color',
      'brand',
      'model',
      'titleRu',
      'titleKy',
      'descriptionRu',
      'descriptionKy',
      'confidence',
      'quality',
    ],
    properties: {
      categorySlug: { type: ['string', 'null'], enum: [...slugs, null] },
      color: { type: ['string', 'null'], enum: [...COLORS, null] },
      brand: { type: ['string', 'null'] },
      model: { type: ['string', 'null'] },
      titleRu: { type: ['string', 'null'] },
      titleKy: { type: ['string', 'null'] },
      descriptionRu: { type: ['string', 'null'] },
      descriptionKy: { type: ['string', 'null'] },
      confidence: { type: 'number' },
      quality: { type: 'string', enum: ['ok', 'blurry', 'dark', 'unknown'] },
    },
  } as const;
}

const FINDINGS: SensitiveFinding[] = [
  'identity_document',
  'bank_card',
  'address_text',
  'phone_number',
  'face',
  'license_plate',
  'key_profile',
  'other_personal_data',
];

const SENSITIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings', 'regions'],
  properties: {
    findings: { type: 'array', items: { type: 'string', enum: FINDINGS } },
    regions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['x', 'y', 'w', 'h', 'kind'],
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
          kind: { type: 'string', enum: FINDINGS },
        },
      },
    },
  },
} as const;

const ANALYSIS_SYSTEM = `You fill in a listing for a lost-and-found app in Kyrgyzstan from one photo of an item.
The person just took the photo and wants the form filled for them, so be genuinely helpful while staying truthful.

Fields:
- categorySlug: the best matching category from the list in the request; null only if none fits.
- color: the dominant colour of the item itself (not the background), from the allowed keys.
- brand: only when a logo, brand name or unmistakable design is clearly visible (e.g. "Apple", "Samsung", "Adidas"). Never guess.
- model: the model or product line only when you can recognise it with confidence (e.g. "iPhone 13", "Galaxy A54", "AirPods Pro"). Otherwise null.
- titleRu / titleKy: short and neutral, at most ~60 characters, mentioning colour and brand/model when known. Follow the wording given in the request (found vs lost).
- descriptionRu / descriptionKy: one or two sentences of visible facts — type, colour, material, notable visible details such as a case, stickers, keychain or wear.
- confidence: 0..1, how sure you are about the category and the item type overall.
- quality: "blurry" or "dark" if the photo makes recognition hard, otherwise "ok".

Never include: text read from documents or cards, names, phone numbers, addresses, serial numbers, IMEI, card numbers, or anything you cannot see. Do not describe hidden features or contents — the owner uses those to prove ownership.
Write natural Russian and natural Kyrgyz.`;

const SENSITIVE_SYSTEM = `You are a privacy safety check for photos that will be published publicly in a lost-and-found app.
Detect: identity documents (passports, ID cards, driver licences, student cards), bank cards, visible addresses, phone numbers, human faces, licence plates, key cutting profiles, and any other personal data (names on tags, QR codes with personal data).
For each finding give a normalized bounding box (0..1, origin top-left). If none, return empty arrays. Return JSON only.`;

function analysisPrompt(ctx: AnalyzeContext): string {
  const wording =
    ctx.listingType === 'LOST'
      ? 'The owner LOST this item and photographed a similar one or an old photo of it. Titles: "Потерян чёрный кошелёк" / "Кара капчык жоголду".'
      : 'Someone FOUND this item. Titles: "Найден чёрный кошелёк" / "Кара капчык табылды".';
  const categories = ctx.categories.map((c) => `- ${c.slug}: ${c.nameRu}`).join('\n');
  return `${wording}\n\nCategories:\n${categories}\n\nFill in the listing for this photo.`;
}

/**
 * Anthropic-backed implementation. The server-side refusal fallback is enabled so a
 * safety-classifier decline on the primary model is retried on a fallback model inside
 * the same call; a refusal on the whole chain is treated as "unavailable" (never as "passed").
 */
export class AnthropicAiProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly enabled = true;
  private readonly logger = new Logger('AI');
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
    timeoutMs: number,
  ) {
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 });
  }

  private async structured<T>(
    system: string,
    prompt: string,
    image: Buffer,
    mimeType: string,
    schema: object,
    effort: Effort,
  ): Promise<T | null> {
    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      output_config: { effort, format: { type: 'json_schema', schema } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as ImageMedia,
                data: image.toString('base64'),
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    } as any);
    if (response.stop_reason === 'refusal') {
      this.logger.warn(`Model refused (${response.stop_details?.category ?? 'unknown'})`);
      return null;
    }
    if (response.stop_reason === 'max_tokens') return null;
    const text = response.content.find((b: any) => b.type === 'text') as
      { text: string } | undefined;
    if (!text) return null;
    try {
      return JSON.parse(text.text) as T;
    } catch {
      return null;
    }
  }

  async analyzeImage(
    image: Buffer,
    mimeType: string,
    context: AnalyzeContext,
  ): Promise<ImageAnalysis | null> {
    const categories = context.categories.length
      ? context.categories
      : CATEGORY_SEED.map((c) => ({ slug: c.slug, nameRu: c.nameRu }));
    try {
      // Low effort: a photo description is quick work, and people wait for it on screen.
      const out = await this.structured<ImageAnalysis>(
        ANALYSIS_SYSTEM,
        analysisPrompt({ ...context, categories }),
        image,
        mimeType,
        analysisSchema(categories.map((c) => c.slug)),
        'low',
      );
      if (!out) return null;
      const clip = (v: unknown, n: number) =>
        typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null;
      return {
        ...out,
        brand: clip(out.brand, 40),
        model: clip(out.model, 40),
        titleRu: clip(out.titleRu, 80),
        titleKy: clip(out.titleKy, 80),
        descriptionRu: clip(out.descriptionRu, 600),
        descriptionKy: clip(out.descriptionKy, 600),
        confidence: Math.max(0, Math.min(1, Number(out.confidence) || 0)),
      };
    } catch (e) {
      this.logger.warn(`analyzeImage failed: ${(e as Error).message}`);
      return null;
    }
  }

  async checkSensitive(image: Buffer, mimeType: string): Promise<SensitiveCheck> {
    try {
      const out = await this.structured<{
        findings: SensitiveFinding[];
        regions: SensitiveCheck['regions'];
      }>(
        SENSITIVE_SYSTEM,
        'Check this photo for personal or sensitive data before publication.',
        image,
        mimeType,
        SENSITIVE_SCHEMA,
        'medium',
      );
      if (!out) return { status: 'unavailable', findings: [], regions: [] };
      const findings = out.findings ?? [];
      const regions = (out.regions ?? []).filter((r) => r.w > 0 && r.h > 0);
      // Documents and bank cards can never be masked into a safe public photo.
      const hardBlock = findings.some(
        (f) => f === 'identity_document' || f === 'bank_card' || f === 'key_profile',
      );
      return { status: hardBlock ? 'blocked' : 'passed', findings, regions };
    } catch (e) {
      this.logger.warn(`checkSensitive failed: ${(e as Error).message}`);
      return { status: 'unavailable', findings: [], regions: [] };
    }
  }
}
