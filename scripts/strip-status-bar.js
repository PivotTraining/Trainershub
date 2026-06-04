#!/usr/bin/env node
// Strip the non-iOS status bar from existing screenshots by masking the
// top region with a flat color that matches each screenshot's background.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [
  { dir: '6.9inch', barHeight: 180 },
  { dir: '6.5inch', barHeight: 132 },
];

async function processFile(srcDir, outDir, file, statusBarHeight) {
  const inPath = path.join(srcDir, file);
  const outPath = path.join(outDir, file);

  const sampleBuf = await sharp(inPath)
    .extract({ left: 10, top: statusBarHeight + 10, width: 1, height: 1 })
    .raw()
    .toBuffer();
  const [r, g, b] = [sampleBuf[0], sampleBuf[1], sampleBuf[2]];

  const meta = await sharp(inPath).metadata();
  const overlay = await sharp({
    create: {
      width: meta.width,
      height: statusBarHeight,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  }).png().toBuffer();

  await sharp(inPath)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .toFile(outPath);

  console.log(`${path.basename(srcDir)}/${file}  bg=rgb(${r},${g},${b})`);
}

(async () => {
  for (const { dir, barHeight } of SIZES) {
    const srcDir = path.join(__dirname, '..', 'screenshots', 'final', dir);
    const outDir = path.join(__dirname, '..', 'screenshots', 'cleaned', dir);
    if (!fs.existsSync(srcDir)) continue;
    fs.mkdirSync(outDir, { recursive: true });
    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.png'));
    for (const f of files) {
      await processFile(srcDir, outDir, f, barHeight);
    }
  }
})();
