/**
 * Rebuilds src/modules/ai/local/label-embeddings.json after labels.ts changes.
 *
 * The server only ships the small image model; label texts are turned into vectors
 * here, once, with the matching MobileCLIP-S0 text model. This needs transformers.js,
 * which is deliberately not a server dependency:
 *
 *   npm i --no-save @huggingface/transformers
 *   MODELS_DIR=/path/with/Xenova/mobileclip_s0 npx tsx scripts/build-ai-labels.ts
 *
 * MODELS_DIR must contain Xenova/mobileclip_s0/{tokenizer.json, tokenizer_config.json,
 * config.json, onnx/text_model_quantized.onnx}. Without it the files are downloaded.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BRAND_PROMPTS,
  COLOR_PROMPTS,
  COLOR_TEMPLATES,
  LOCAL_LABELS,
  PROMPT_TEMPLATES,
} from '../src/modules/ai/local/labels';
import { labelsFingerprint } from '../src/modules/ai/local/label-index';

const MODEL = 'Xenova/mobileclip_s0';

async function main() {
  const spec = process.env.TRANSFORMERS_JS
    ? pathToFileURL(process.env.TRANSFORMERS_JS).href
    : '@huggingface/transformers';
  const tf: any = await import(spec);
  if (process.env.MODELS_DIR) {
    tf.env.localModelPath = process.env.MODELS_DIR;
    tf.env.allowRemoteModels = false;
  }
  const tokenizer = await tf.AutoTokenizer.from_pretrained(MODEL);
  const textModel = await tf.CLIPTextModelWithProjection.from_pretrained(MODEL, {
    model_file_name: 'text_model',
    dtype: 'q8',
  });

  async function embed(texts: string[]): Promise<string> {
    const inputs = tokenizer(texts, { padding: 'max_length', truncation: true });
    const { text_embeds } = await textModel(inputs);
    const rows: number[][] = text_embeds.normalize().tolist();
    const mean = new Float32Array(rows[0].length);
    for (const r of rows) for (let i = 0; i < r.length; i++) mean[i] += r[i] / rows.length;
    let norm = 0;
    for (const v of mean) norm += v * v;
    norm = Math.sqrt(norm);
    for (let i = 0; i < mean.length; i++) mean[i] /= norm;
    return Buffer.from(mean.buffer).toString('base64');
  }

  const fill = (templates: string[], prompt: string) =>
    templates.map((t) => t.replace('{}', prompt));
  const labels: Record<string, string> = {};
  for (const l of LOCAL_LABELS) {
    labels[l.id] = await embed(l.prompts.flatMap((p) => fill(PROMPT_TEMPLATES, p)));
    process.stdout.write('.');
  }
  const colors: Record<string, string> = {};
  for (const [key, word] of Object.entries(COLOR_PROMPTS))
    colors[key] = await embed(fill(COLOR_TEMPLATES, word));

  const brands: Record<string, string> = {};
  for (const [labelId, options] of Object.entries(BRAND_PROMPTS))
    for (const [i, o] of options.entries())
      brands[`${labelId}:${i}`] = await embed(fill(PROMPT_TEMPLATES, o.prompt));

  const out = join(__dirname, '../src/modules/ai/local/label-embeddings.json');
  writeFileSync(
    out,
    JSON.stringify(
      { model: MODEL, fingerprint: labelsFingerprint(), dim: 512, labels, colors, brands },
      null,
      1,
    ) + '\n',
  );
  console.log(
    `\nWrote ${Object.keys(labels).length} labels and ${Object.keys(colors).length} colours to ${out}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
