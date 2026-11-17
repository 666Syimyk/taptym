import sharp from 'sharp';
import { analyzeColors, classifyPixel } from './color-analysis';

/** A coloured rectangle in the middle of a plain backdrop, like a photo of an item. */
async function item(
  fg: { r: number; g: number; b: number },
  bg = { r: 245, g: 245, b: 245 },
  size = 200,
) {
  const box = await sharp({
    create: { width: size / 2, height: size / 2, channels: 3, background: fg },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: bg } })
    .composite([{ input: box, left: size / 4, top: size / 4 }])
    .jpeg()
    .toBuffer();
}

describe('pixel colour names', () => {
  it.each([
    [[20, 20, 22], 'black'],
    [[250, 250, 250], 'white'],
    [[128, 128, 130], 'gray'],
    [[210, 30, 40], 'red'],
    [[240, 140, 30], 'orange'],
    [[240, 210, 40], 'yellow'],
    [[40, 170, 80], 'green'],
    [[30, 90, 210], 'blue'],
    [[130, 70, 200], 'purple'],
    [[240, 150, 190], 'pink'],
    [[110, 70, 35], 'brown'],
    [[220, 200, 165], 'beige'],
  ])('%j → %s', ([r, g, b], name) => {
    expect(classifyPixel(r, g, b)).toBe(name);
  });
});

describe('analyzeColors', () => {
  it('names the item, not the backdrop', async () => {
    expect((await analyzeColors(await item({ r: 200, g: 30, b: 40 }))).color).toBe('red');
    expect((await analyzeColors(await item({ r: 25, g: 25, b: 28 }))).color).toBe('black');
    expect((await analyzeColors(await item({ r: 30, g: 80, b: 200 }))).color).toBe('blue');
  });

  it('finds a white item on a dark table', async () => {
    const a = await analyzeColors(await item({ r: 245, g: 245, b: 245 }, { r: 60, g: 40, b: 25 }));
    expect(a.color).toBe('white');
  });

  it('calls a striped item multicoloured', async () => {
    const stripes = await sharp({
      create: { width: 120, height: 120, channels: 3, background: { r: 245, g: 245, b: 245 } },
    })
      .composite(
        [
          { r: 220, g: 30, b: 30 },
          { r: 30, g: 150, b: 60 },
          { r: 30, g: 80, b: 220 },
        ].map((background, i) => ({
          input: { create: { width: 20, height: 80, channels: 3 as const, background } },
          left: 30 + i * 20,
          top: 20,
        })),
      )
      .jpeg()
      .toBuffer();
    expect((await analyzeColors(stripes)).color).toBe('multicolor');
  });

  it('flags dark and blurry photos', async () => {
    const dark = await item({ r: 12, g: 12, b: 14 }, { r: 8, g: 8, b: 8 });
    expect((await analyzeColors(dark)).quality).toBe('dark');
    const blurry = await sharp(await item({ r: 200, g: 30, b: 40 }))
      .blur(12)
      .jpeg()
      .toBuffer();
    expect((await analyzeColors(blurry)).quality).toBe('blurry');
    expect((await analyzeColors(await item({ r: 200, g: 30, b: 40 }))).quality).toBe('ok');
    // Deep colours and black items are not underexposed photos.
    const navy = await sharp({
      create: { width: 80, height: 80, channels: 3, background: { r: 10, g: 10, b: 200 } },
    })
      .png()
      .toBuffer();
    expect((await analyzeColors(navy)).quality).not.toBe('dark');
    const blackClose = await item({ r: 22, g: 22, b: 24 }, { r: 110, g: 110, b: 112 });
    expect((await analyzeColors(blackClose)).quality).not.toBe('dark');
  });
});
