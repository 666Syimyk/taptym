/**
 * Downloads the on-device recognition model once (the server also does this by
 * itself on first start). Usage: npm run ai:model
 */
import * as path from 'node:path';
import { loadConfig } from '../src/config/app-config';
import { downloadVerified } from '../src/modules/ai/local/model-download';
import { VISION_MODEL, VisionModel } from '../src/modules/ai/local/vision-model';

async function main() {
  const cfg = loadConfig();
  const model = new VisionModel(path.resolve(cfg.ai.localModelDir));
  if (await model.verify()) {
    console.log(`Model already in place: ${model.file}`);
    return;
  }
  console.log(`Downloading ${Math.round(VISION_MODEL.size / 1e6)} MB to ${model.file}`);
  const ok = await downloadVerified(
    {
      url: cfg.ai.localModelUrl ?? VISION_MODEL.url,
      file: model.file,
      size: VISION_MODEL.size,
      sha256: VISION_MODEL.sha256,
    },
    { log: (m) => console.log(m) },
  );
  if (!ok) throw new Error('Download failed. Check the connection or set AI_LOCAL_MODEL_URL.');
  console.log(`Done: ${model.file}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
