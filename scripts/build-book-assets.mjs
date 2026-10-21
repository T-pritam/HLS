/**
 * One-off: builds the optimised /book images in public/book/ from the brand
 * originals in public/ (which are left untouched). Run: npm run assets:book
 */
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = (f) => path.join(root, 'public', f);
const out = (f) => path.join(root, 'public', 'book', f);
await mkdir(out(''), { recursive: true });

const kb = async (f) => `${((await stat(f)).size / 1024).toFixed(1)} KB`;
const report = [];

async function trimmed(file) {
  return sharp(await sharp(src(file)).trim({ threshold: 4 }).png().toBuffer());
}

async function lockup(file, name, widths) {
  for (const w of widths) {
    const img = (await trimmed(file)).resize({ width: w });
    await img.clone().webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(out(`${name}-${w}.webp`));
    await img.clone().png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(out(`${name}-${w}.png`));
    const meta = await sharp(out(`${name}-${w}.png`)).metadata();
    report.push([`${name}-${w}.webp`, file, await kb(src(file)), await kb(out(`${name}-${w}.webp`)), `${meta.width}x${meta.height}`]);
    report.push([`${name}-${w}.png`, file, await kb(src(file)), await kb(out(`${name}-${w}.png`)), `${meta.width}x${meta.height}`]);
  }
}

// Light-background lockup on light, dark-background lockup on dark.
await lockup('hls_logo_light.png', 'logo-light', [140, 280]);
await lockup('hls_logo_dark.png', 'logo-dark', [160, 320]);

// Crest alone (favicon-style mark) at small sizes.
for (const w of [64, 128]) {
  const img = sharp(src('hls_crest.png')).resize({ width: w });
  await img.clone().webp({ quality: 88, effort: 6 }).toFile(out(`crest-${w}.webp`));
  await img.clone().png({ compressionLevel: 9, palette: true, effort: 10 }).toFile(out(`crest-${w}.png`));
  report.push([`crest-${w}.webp`, 'hls_crest.png', await kb(src('hls_crest.png')), await kb(out(`crest-${w}.webp`)), '']);
  report.push([`crest-${w}.png`, 'hls_crest.png', await kb(src('hls_crest.png')), await kb(out(`crest-${w}.png`)), '']);
}

// Page photos, 3:2, at two widths each. WebP with a JPEG fallback.
for (const name of ['hands-writing', 'two-chairs']) {
  const file = `photos/${name}.png`;
  for (const w of [720, 1280]) {
    const img = sharp(src(file)).resize({ width: w });
    await img.clone().webp({ quality: 78, effort: 6 }).toFile(out(`${name}-${w}.webp`));
    await img.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(out(`${name}-${w}.jpg`));
    report.push([`${name}-${w}.webp`, file, await kb(src(file)), await kb(out(`${name}-${w}.webp`)), '']);
    report.push([`${name}-${w}.jpg`, file, await kb(src(file)), await kb(out(`${name}-${w}.jpg`)), '']);
  }
}

// Share image: the dark lockup on Navy. Brand assets only, no claims.
const logo = await (await trimmed('hls_logo_dark.png')).resize({ width: 640 }).png().toBuffer();
const { height } = await sharp(logo).metadata();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#102030' } })
  .composite([{ input: logo, left: 280, top: Math.round((630 - height) / 2) }])
  .png({ compressionLevel: 9, palette: true, effort: 10 })
  .toFile(out('og.png'));
report.push(['og.png', 'hls_logo_dark.png', await kb(src('hls_logo_dark.png')), await kb(out('og.png')), '1200x630']);

console.table(report.map(([file, from, before, after, size]) => ({ file, from, before, after, size })));
