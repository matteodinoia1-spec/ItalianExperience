import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.git', 'assets/img/_stage1_backup']);
const issues = [];
const htmlFiles = [];

function shouldSkip(relativePath) {
  for (const dir of skipDirs) {
    if (relativePath === dir || relativePath.startsWith(`${dir}/`)) return true;
  }
  return false;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
    if (shouldSkip(relativePath)) continue;
    if (entry.isDirectory()) {
      walk(absolutePath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(absolutePath);
  }
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

function findMissingH1(content) {
  return !/<h1\b/i.test(content);
}

function hasViewport(content) {
  return /<meta\s+name=["']viewport["']/i.test(content);
}

function hasTitle(content) {
  return /<title>.*<\/title>/is.test(content);
}

function hasLang(content) {
  return /<html[^>]*\blang=["'][^"']+["']/i.test(content);
}

function hasCanonical(content) {
  return /<link\s+rel=["']canonical["']/i.test(content);
}

walk(root);

for (const file of htmlFiles) {
  const rel = relative(file);
  const content = fs.readFileSync(file, 'utf8');
  const isPartial = rel.startsWith('partials/');

  if (!hasLang(content) && !isPartial) {
    issues.push({ type: 'a11y', severity: 'high', file: rel, message: 'Missing <html lang="...">' });
  }
  if (!hasViewport(content) && !isPartial) {
    issues.push({ type: 'responsive', severity: 'high', file: rel, message: 'Missing viewport meta' });
  }
  if (!hasTitle(content) && !isPartial) {
    issues.push({ type: 'seo', severity: 'high', file: rel, message: 'Missing <title>' });
  }
  if (findMissingH1(content) && !isPartial) {
    issues.push({ type: 'a11y', severity: 'medium', file: rel, message: 'Missing page-level <h1>' });
  }
  if (!hasCanonical(content) && !isPartial && rel !== '404.html') {
    issues.push({ type: 'seo', severity: 'low', file: rel, message: 'Missing canonical link' });
  }

  const imgRegex = /<img\b[^>]*>/gi;
  const images = content.match(imgRegex) || [];
  for (const imgTag of images) {
    if (!/\balt\s*=\s*["'][^"']*["']/i.test(imgTag)) {
      issues.push({ type: 'a11y', severity: 'high', file: rel, message: 'Image without alt attribute' });
      break;
    }
  }
}

if (issues.length) {
  console.error('Static audit found issues:');
  for (const issue of issues) {
    console.error(`- [${issue.severity}] [${issue.type}] ${issue.file}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(`OK: static audit passed on ${htmlFiles.length} HTML files.`);
