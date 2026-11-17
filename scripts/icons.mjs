import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { root } from "./utils.mjs";
const sharp = createRequire(
  new URL("../backend/package.json", import.meta.url),
)("sharp");
const svg = await readFile(join(root, "admin/public/icon.svg"));
async function png(path, size) {
  await sharp(svg).resize(size, size).png().toFile(join(root, path));
}
for (const [density, size] of Object.entries({
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}))
  await png(
    `mobile/android/app/src/main/res/mipmap-${density}/ic_launcher.png`,
    size,
  );
for (const size of [192, 512]) {
  await png(`mobile/web/icons/Icon-${size}.png`, size);
  await png(`mobile/web/icons/Icon-maskable-${size}.png`, size);
}
await png("mobile/web/favicon.png", 32);
const dir = "mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset";
const manifest = JSON.parse(
  await readFile(join(root, dir, "Contents.json"), "utf8"),
);
for (const image of manifest.images) {
  if (image.filename)
    await png(
      `${dir}/${image.filename}`,
      Math.round(parseFloat(image.size) * parseFloat(image.scale)),
    );
}
console.log("Иконки Android, iOS и Web обновлены.");
