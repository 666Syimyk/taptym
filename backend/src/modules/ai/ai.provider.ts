/**
 * AI layer contract (PRD §22.4). The mobile app never talks to a model provider
 * directly; it only receives safe, structured suggestions from this adapter.
 *
 * Two independent responsibilities:
 *  - analyzeImage(): fills the listing from the photo (category, colour, brand,
 *    title). The person can change every field; nothing is published unseen.
 *  - checkSensitive(): mandatory safety check before a photo becomes public.
 *    `passed` only comes from a check that can read text and see faces; anything
 *    else is `unavailable`, and the listing goes to manual review (never bypassed).
 *
 * Providers: on-device recognition is always on (no key, no network); with
 * ANTHROPIC_API_KEY, Claude is asked first and the local result fills the gaps.
 */
export interface ImageAnalysis {
  /** Category slug from the seeded list or null when uncertain. */
  categorySlug: string | null;
  /** Colour key from COLORS or null. */
  color: string | null;
  /** Brand only when a logo or brand text is clearly readable on the item. */
  brand: string | null;
  /** Model / product line only when recognisable with certainty (e.g. "iPhone 13"). */
  model: string | null;
  /** Short neutral title suggestion in Russian, e.g. "Найден чёрный кошелёк". */
  titleRu: string | null;
  titleKy: string | null;
  /** 1–2 sentences describing only visible facts. */
  descriptionRu: string | null;
  descriptionKy: string | null;
  /** 0..1 — the UI shows suggestions below 0.5 as "not sure". */
  confidence: number;
  /** quality hints: blurry, dark, ok */
  quality: 'ok' | 'blurry' | 'dark' | 'unknown';
  /** Which engine answered; shown nowhere, kept for support and statistics. */
  source?: 'anthropic' | 'local';
}

export type SensitiveFinding =
  | 'identity_document'
  | 'bank_card'
  | 'address_text'
  | 'phone_number'
  | 'face'
  | 'license_plate'
  | 'key_profile'
  | 'other_personal_data';

export interface SensitiveCheck {
  status: 'passed' | 'blocked' | 'unavailable';
  findings: SensitiveFinding[];
  /** Normalized boxes (0..1) to blur when masking is possible. */
  regions: { x: number; y: number; w: number; h: number; kind: SensitiveFinding }[];
}

/** What the model needs to word the listing and pick a category. */
export interface AnalyzeContext {
  listingType: 'LOST' | 'FOUND';
  /** Active categories at upload time (admins can add new ones). */
  categories: { slug: string; nameRu: string }[];
}

export interface AiStatus {
  provider: string;
  /** State of on-device recognition: ready, downloading, missing, ... */
  recognition: 'ready' | 'loading' | 'downloading' | 'missing' | 'error' | 'off';
}

export interface AiProvider {
  readonly name: string;
  readonly enabled: boolean;
  analyzeImage(
    image: Buffer,
    mimeType: string,
    context: AnalyzeContext,
  ): Promise<ImageAnalysis | null>;
  checkSensitive(image: Buffer, mimeType: string): Promise<SensitiveCheck>;
  status?(): AiStatus;
  start?(): void;
  shutdown?(): void;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export const UNAVAILABLE: SensitiveCheck = Object.freeze({
  status: 'unavailable',
  findings: [],
  regions: [],
}) as SensitiveCheck;

export class DisabledAiProvider implements AiProvider {
  readonly name = 'disabled';
  readonly enabled = false;
  async analyzeImage(): Promise<ImageAnalysis | null> {
    return null;
  }
  async checkSensitive(): Promise<SensitiveCheck> {
    return { status: 'unavailable', findings: [], regions: [] };
  }
  status(): AiStatus {
    return { provider: 'disabled', recognition: 'off' };
  }
}
