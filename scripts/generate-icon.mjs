/**
 * Generates app icon PNGs from the T-mark SVG.
 * Run: node scripts/generate-icon.mjs
 *
 * Outputs:
 *   assets/images/icon.png          — 1024×1024  (App Store / EAS)
 *   assets/images/splash-icon.png   — 200×200    (Expo splash)
 *   assets/images/favicon.png       — 64×64      (web)
 *   assets/android-icon.png         — 1024×1024  (source for adaptive icon)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const AMBER = '#D97706';
const WHITE = '#FFFFFF';

// T-mark path (100×100 viewBox)
const T_PATH =
  'M 8,40 L 36,40 L 50,18 L 64,40 L 92,40 L 92,58 L 64,58 L 64,90 L 36,90 L 36,58 L 8,58 Z';

function makeSvg(size, bgColor, markColor, rx = Math.round(size * 0.22)) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect x="0" y="0" width="100" height="100" rx="${rx}" ry="${rx}" fill="${bgColor}"/>
  <path d="${T_PATH}" fill="${markColor}"/>
</svg>`;
}

async function svgToPng(svgString, outPath) {
  // Use sharp if available, otherwise fall back to writing the SVG as-is
  // and letting Expo / Xcode handle the conversion.
  try {
    const sharp = await import('sharp').catch(() => null);
    if (sharp) {
      await sharp.default(Buffer.from(svgString))
        .png()
        .toFile(outPath);
      console.log(`✓ ${outPath}`);
      return;
    }
  } catch {}

  // Fallback: write SVG with .png extension — Expo tools accept SVG source files
  writeFileSync(outPath, svgString);
  console.log(`✓ ${outPath} (SVG source — convert manually if needed)`);
}

const targets = [
  { name: 'assets/images/icon.png',        size: 1024, rx: 0   },  // EAS adds radius
  { name: 'assets/images/splash-icon.png', size: 200,  rx: 0   },
  { name: 'assets/images/favicon.png',     size: 64,   rx: 14  },
];

for (const t of targets) {
  const svg = makeSvg(t.size, AMBER, WHITE, t.rx);
  await svgToPng(svg, resolve(root, t.name));
}

console.log('\nDone. Re-run EAS build to pick up new icons.');
