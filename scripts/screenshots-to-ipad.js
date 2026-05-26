#!/usr/bin/env node
// Pad cleaned iPhone screenshots to the iPad sizes App Store Connect requires.
// The iPhone capture sits centered with matching background fill on the sides.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'screenshots', 'cleaned', '6.9inch');
const TARGETS = [
  { name: 'ipad-13in', width: 2064, height: 2752 },  // iPad Pro 13" M4
  { name: 'ipad-12.9in', width: 2048, height: 2732 }, // iPad Pro 12.9" (older)
];

async function processFile(file, target) {
  const inPath = path.join(SRC_DIR, file);
  const outDir = path.join(__dirname, '..', 'screenshots', 'cleaned', target.name);
  const outPath = path.join(outDir, file);
  fs.mkdirSync(outDir, { recursive: true });

  // Sample background color near the middle for fill.
  const meta = await sharp(inPath).metadata();
  const sampleBuf = await sharp(inPath)
    .extract({ left: 10, top: Math.floor(meta.height / 2), width: 1, height: 1 })
    .raw()
    .toBuffer();
  const [r, g, b] = [sampleBuf[0], sampleBuf[1], sampleBuf[2]];

  // Resize to fit within target while preserving aspect ratio, then center
  // on a canvas of the target size with sampled background fill.
  await sharp(inPath)
    .resize({
      width: target.width,
      height: target.height,
      fit: 'contain',
      background: { r, g, b, alpha: 1 },
    })
    .toFile(outPath);

  console.log(`${target.name}/${file}  ${target.width}x${target.height}  bg=rgb(${r},${g},${b})`);
}

(async () => {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.png'));
  for (const target of TARGETS) {
    for (const f of files) await processFile(f, target);
  }
})();
