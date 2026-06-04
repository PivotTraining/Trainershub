// Convert iPad screenshots (2064x2752) to the iPhone slot sizes that App
// Store Connect accepts. We scale to fit each target's height while
// preserving aspect, then pad horizontally with the sampled background.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'screenshots', 'app-store');
const TARGETS = [
  { name: 'iphone-6.9in', width: 1320, height: 2868 },
  { name: 'iphone-6.5in', width: 1242, height: 2688 },
];
const FILES = [
  'trainer-01-home.png',
  'trainer-05-requests.png',
  'trainer-06-packages.png',
  'trainer-07-profile.png',
];

(async () => {
  for (const t of TARGETS) {
    const outDir = path.join(SRC, t.name);
    fs.mkdirSync(outDir, { recursive: true });
    for (const f of FILES) {
      const inPath = path.join(SRC, f);
      const outPath = path.join(outDir, f);
      // Sample a background pixel from a quiet area (top center, below the
      // small "Home"/"Profile" header line in the captures).
      const meta = await sharp(inPath).metadata();
      const sample = await sharp(inPath)
        .extract({ left: Math.floor(meta.width / 2), top: 200, width: 1, height: 1 })
        .raw()
        .toBuffer();
      const [r, g, b] = [sample[0], sample[1], sample[2]];
      await sharp(inPath)
        .resize({
          width: t.width,
          height: t.height,
          fit: 'contain',
          background: { r, g, b, alpha: 1 },
        })
        .toFile(outPath);
      console.log(`${t.name}/${f}  bg=rgb(${r},${g},${b})`);
    }
  }
})();
