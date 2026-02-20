import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.git', 'assets/img/_stage1_backup']);
const htmlFiles = [];
const problems = [];

function shouldSkip(relativePath) {
  for (const dir of skipDirs) {
    if (relativePath === dir || relativePath.startsWith(`${dir}/`)) return true;
  }
  return false;
}

function collectHtmlFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');

    if (shouldSkip(relativePath)) continue;

    if (entry.isDirectory()) {
      collectHtmlFiles(absolutePath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(absolutePath);
    }
  }
}

function normalizeTarget(link) {
  let clean = link.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (clean.startsWith('/ItalianExperience/')) clean = clean.replace('/ItalianExperience/', '/');
  if (clean === '/ItalianExperience') clean = '/';
  return clean;
}

function isExternalOrIgnored(link) {
  return (
    !link ||
    link.startsWith('http://') ||
    link.startsWith('https://') ||
    link.startsWith('mailto:') ||
    link.startsWith('tel:') ||
    link.startsWith('#') ||
    link.startsWith('data:') ||
    link.startsWith('//')
  );
}

function resolveTarget(filePath, link) {
  if (link.startsWith('/')) return path.join(root, link);
  return path.resolve(path.dirname(filePath), link);
}

collectHtmlFiles(root);

const attrRegex = /\b(?:href|src)="([^"]+)"/g;

for (const filePath of htmlFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;

  while ((match = attrRegex.exec(content)) !== null) {
    const rawLink = match[1].trim();
    if (isExternalOrIgnored(rawLink)) continue;

    const normalized = normalizeTarget(rawLink);
    if (!normalized) continue;

    const target = resolveTarget(filePath, normalized);
    const exists =
      fs.existsSync(target) ||
      fs.existsSync(`${target}.html`) ||
      fs.existsSync(path.join(target, 'index.html'));

    if (!exists) {
      problems.push({
        file: path.relative(root, filePath).replaceAll('\\', '/'),
        link: rawLink,
        resolved: path.relative(root, target).replaceAll('\\', '/')
      });
    }
  }
}

if (problems.length) {
  console.error('Broken local links/assets detected:');
  for (const item of problems) {
    console.error(`- ${item.file} -> ${item.link} (resolved: ${item.resolved})`);
  }
  process.exit(1);
}

console.log(`OK: ${htmlFiles.length} HTML files checked, no broken local links/assets.`);
