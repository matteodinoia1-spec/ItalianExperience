#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC_DIR = path.resolve('assets/img/travel/gapyear');
const TARGETS = [1280, 1920, 2560];
const QUALITY = 65;

const isJpg = (name) => /\.jpe?g$/i.test(name);

const entries = await fs.readdir(SRC_DIR, { withFileTypes: true });
const sources = entries
  .filter((e) => e.isFile() && isJpg(e.name))
  .map((e) => path.join(SRC_DIR, e.name))
  // Skip pre-sized JPG derivatives; keep canonical originals.
  .filter((p) => !/-(960|1280|1600|1920|2560)\.jpe?g$/i.test(path.basename(p)))
  .sort();

const generated = [];
const skipped = [];

for (const src of sources) {
  const base = src.replace(/\.jpe?g$/i, '');
  let meta;
  try {
    meta = await sharp(src).metadata();
  } catch (err) {
    skipped.push({ src, reason: `unreadable (${err.message})` });
    continue;
  }

  const width = meta.width || 0;
  if (!width) {
    skipped.push({ src, reason: 'missing width metadata' });
    continue;
  }

  for (const target of TARGETS) {
    if (width < target) {
      skipped.push({ src, target, reason: 'source smaller than target (no upscale)' });
      continue;
    }

    const out = `${base}-${target}.avif`;
    try {
      await fs.access(out);
      skipped.push({ src, target, reason: 'already exists' });
      continue;
    } catch {
      // file does not exist, proceed
    }

    await sharp(src)
      .resize({ width: target, fit: 'inside', withoutEnlargement: true })
      .avif({ quality: QUALITY })
      .toFile(out);

    generated.push(out);
  }
}

console.log(JSON.stringify({
  source_count: sources.length,
  generated_count: generated.length,
  generated: generated.map((p) => path.relative(process.cwd(), p).replace(/\\/g, '/')),
  skipped
}, null, 2));
