#!/usr/bin/env node

/**
 * Base-path migration build script.
 *
 * Non-destructive: source `.html` files remain committed with `%%BASE_PATH%%`.
 *
 * Behavior:
 * - Reads the migrated HTML files from the project root.
 * - Writes compiled versions into `dist/`, preserving the same relative paths.
 * - In the compiled files only, replaces the literal `%%BASE_PATH%%`
 *   placeholder with the current production base path (`/ItalianExperience`).
 *
 * Safety:
 * - Source files are never modified by this script.
 * - Only the literal placeholder string is replaced in the output.
 * - Idempotent: running multiple times simply rewrites the same dist files
 *   with identical contents.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import url from "node:url";

const BASE_PATH = "/ItalianExperience";
const PLACEHOLDER = "%%BASE_PATH%%";

// Migration scope: only these files are processed (source uses %%BASE_PATH%%).
const MIGRATED_FILES = [
  "index.html",
  "partials/header.html",
  "partials/footer.html",
  "404.html",
  "contact/index.html",
  "privacy/index.html",
  "travel/index.html",
  "travel/gapyear/index.html",
  "travel/culinary/index.html",
  "travel/bespoke/index.html",
  "recruitment/index.html",
  "recruitment/employer/index.html",
  "recruitment/candidate/index.html",
  "flavors/index.html",
  "flavors/for-your-home/index.html",
  "flavors/for-your-business/index.html",
  "flavors/aziende-italiane/index.html",
  "estates/index.html",
];

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function buildFile(relativePath) {
  const srcPath = path.join(projectRoot, relativePath);
  const outPath = path.join(distRoot, relativePath);

  const original = await fs.readFile(srcPath, "utf8");
  const hasPlaceholder = original.includes(PLACEHOLDER);
  const compiled = hasPlaceholder
    ? original.split(PLACEHOLDER).join(BASE_PATH)
    : original;

  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, compiled, "utf8");

  return hasPlaceholder;
}

async function main() {
  await ensureDir(distRoot);

  let changedCount = 0;

  for (const relativePath of MIGRATED_FILES) {
    const hadPlaceholder = await buildFile(relativePath);
    if (hadPlaceholder) {
      changedCount += 1;
      // eslint-disable-next-line no-console
      console.log(
        `Compiled with base-path replacement -> ${relativePath}`
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`Compiled (no placeholders found) -> ${relativePath}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Base-path build complete. Files with placeholder replacements: ${changedCount}. BASE_PATH='${BASE_PATH}'.`
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Error running replace-base-path script:", err);
  process.exitCode = 1;
});

