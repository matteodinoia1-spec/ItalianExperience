import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();

const htmlFiles = [
  'index.html',
  '404.html',
  'contact/index.html',
  'estates/index.html',
  'flavors/index.html',
  'flavors/for-your-home/index.html',
  'flavors/for-your-business/index.html',
  'flavors/aziende-italiane/index.html',
  'recruitment/index.html',
  'recruitment/candidate/index.html',
  'recruitment/employer/index.html',
  'travel/index.html',
  'travel/culinary/index.html',
  'travel/bespoke/index.html',
  'travel/gapyear/index.html'
];

const imgTagRegex = /<img\b[^>]*>/g;
const srcRegex = /\bsrc="([^"]+)"/i;

async function getImageSize(src) {
  if (!src || /^https?:\/\//i.test(src) || src.startsWith('data:')) return null;
  let relPath;

  if (src.startsWith('/ItalianExperience/')) {
    relPath = src.replace(/^\/ItalianExperience\//, '');
  } else if (src.startsWith('/')) {
    relPath = src.replace(/^\//, '');
  } else {
    return null;
  }

  const absPath = path.join(root, relPath);

  try {
    const metadata = await sharp(absPath).metadata();
    if (!metadata.width || !metadata.height) return null;
    return { width: metadata.width, height: metadata.height };
  } catch {
    return null;
  }
}

function hasDimensions(tag) {
  return /\bwidth="/i.test(tag) || /\bheight="/i.test(tag);
}

async function processFile(filePath) {
  const abs = path.join(root, filePath);
  const original = await fs.readFile(abs, 'utf8');
  const tags = original.match(imgTagRegex) || [];
  if (!tags.length) return { filePath, updated: false, count: 0 };

  let updatedHtml = original;
  let updatedCount = 0;

  for (const tag of tags) {
    if (hasDimensions(tag)) continue;
    const srcMatch = tag.match(srcRegex);
    const src = srcMatch ? srcMatch[1] : '';
    const size = await getImageSize(src);
    if (!size) continue;

    const replacement = tag.replace(
      '<img',
      `<img width="${size.width}" height="${size.height}"`
    );
    updatedHtml = updatedHtml.replace(tag, replacement);
    updatedCount += 1;
  }

  if (updatedCount > 0) {
    await fs.writeFile(abs, updatedHtml, 'utf8');
    return { filePath, updated: true, count: updatedCount };
  }

  return { filePath, updated: false, count: 0 };
}

async function main() {
  const results = [];
  for (const file of htmlFiles) {
    results.push(await processFile(file));
  }

  const changed = results.filter((r) => r.updated);
  const total = changed.reduce((acc, r) => acc + r.count, 0);
  console.log(`Updated ${total} images across ${changed.length} files.`);
  changed.forEach((r) => console.log(`${r.filePath}: ${r.count}`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
