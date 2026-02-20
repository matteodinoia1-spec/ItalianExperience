#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'assets', 'img');
const TARGETS = [960, 1280, 1920, 2560];
const QUALITY = 67;
const MIN_SOURCE_WIDTH = 1280;

const EXCLUDED_DIRS = new Set(['node_modules', '.git']);
const SKIP_DIR_MARKERS = ['/assets/img/_stage1_backup/'];
const PRE_SIZED_SUFFIX = /-(960|1280|1600|1920|2560)$/i;
const SOURCE_EXT = /\.(jpg|jpeg|png)$/i;

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function isExcludedDir(name) {
  return EXCLUDED_DIRS.has(name);
}

function shouldSkipPath(absPath) {
  const rel = `/${toPosix(path.relative(ROOT, absPath))}/`;
  return SKIP_DIR_MARKERS.some((marker) => rel.includes(marker));
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isExcludedDir(entry.name) || shouldSkipPath(full)) continue;
      await walk(full, out);
      continue;
    }
    if (!SOURCE_EXT.test(entry.name)) continue;
    const stem = entry.name.replace(SOURCE_EXT, '');
    if (PRE_SIZED_SUFFIX.test(stem)) continue;
    out.push(full);
  }
  return out;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

const generated = [];
const skipped = [];
const failed = [];

const sources = (await walk(SRC_DIR)).sort();

for (const srcAbs of sources) {
  const srcRel = toPosix(path.relative(ROOT, srcAbs));
  let meta;
  try {
    meta = await sharp(srcAbs).metadata();
  } catch (error) {
    failed.push({ source: srcRel, reason: `metadata_read_failed: ${error.message}` });
    continue;
  }

  const width = meta.width || 0;
  if (!width) {
    failed.push({ source: srcRel, reason: 'metadata_missing_width' });
    continue;
  }

  if (width < MIN_SOURCE_WIDTH) {
    skipped.push({ source: srcRel, reason: `source_width_${width}_below_${MIN_SOURCE_WIDTH}` });
    continue;
  }

  const ext = path.extname(srcAbs);
  const stemAbs = srcAbs.slice(0, -ext.length);
  const stemRel = srcRel.slice(0, -ext.length);

  for (const target of TARGETS) {
    if (width < target) {
      skipped.push({ source: srcRel, target, reason: 'no_upscale' });
      continue;
    }

    const outAbs = `${stemAbs}-${target}.avif`;
    const outRel = `${stemRel}-${target}.avif`;

    if (await exists(outAbs)) {
      skipped.push({ source: srcRel, target, reason: 'already_exists' });
      continue;
    }

    try {
      await sharp(srcAbs)
        .resize({ width: target, fit: 'inside', withoutEnlargement: true })
        .avif({ quality: QUALITY })
        .toFile(outAbs);
      generated.push(outRel);
    } catch (error) {
      failed.push({ source: srcRel, target, reason: `encode_failed: ${error.message}` });
    }
  }
}

const report = {
  config: {
    source_dir: toPosix(path.relative(ROOT, SRC_DIR)),
    targets: TARGETS,
    quality: QUALITY,
    min_source_width: MIN_SOURCE_WIDTH
  },
  source_count: sources.length,
  generated_count: generated.length,
  skipped_count: skipped.length,
  failed_count: failed.length,
  generated,
  skipped,
  failed
};

console.log(JSON.stringify(report, null, 2));
