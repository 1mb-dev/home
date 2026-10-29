#!/usr/bin/env node

/**
 * Generate the work index from content/.
 *
 * Deterministic: same content in, same docs/ out. Output is committed and CI fails
 * when it is stale (run `npm run gen`). Writes:
 *   docs/index.html          the block between <!-- gen:work:start/end -->
 *   docs/work/{slug}/        one page per listed work (directory rebuilt each run)
 *   docs/sitemap.xml
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as prettier from 'prettier';
import {
  ContentError,
  checkDurable,
  parseIndex,
  parseWork,
  renderIndex,
  renderPage,
  renderSitemap,
  sitemapLocs,
  validateCollection,
} from './work.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const DOCS = join(ROOT, 'docs');
const START = '<!-- gen:work:start -->';
const END = '<!-- gen:work:end -->';

async function format(source, filepath) {
  const options = await prettier.resolveConfig(filepath);
  return prettier.format(source, { ...options, filepath });
}

async function main() {
  const entries = parseIndex(readFileSync(join(CONTENT, 'index.txt'), 'utf8'));

  // Every work file is parsed, listed or not: drafts are validated too.
  const works = new Map();
  for (const name of readdirSync(join(CONTENT, 'work')).sort()) {
    if (!name.endsWith('.md')) continue;
    const slug = name.slice(0, -3);
    works.set(slug, parseWork(readFileSync(join(CONTENT, 'work', name), 'utf8'), slug));
  }
  validateCollection(entries, works);

  const sitemapPath = join(DOCS, 'sitemap.xml');
  checkDurable(sitemapLocs(readFileSync(sitemapPath, 'utf8')), entries);

  const indexPath = join(DOCS, 'index.html');
  const index = readFileSync(indexPath, 'utf8');
  const start = index.indexOf(START);
  const end = index.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`docs/index.html: missing ${START} ... ${END}`);
  }
  const block = `${START}\n${renderIndex(entries, works)}\n`;
  writeFileSync(indexPath, await format(index.slice(0, start) + block + index.slice(end), indexPath));

  const workDir = join(DOCS, 'work');
  if (existsSync(workDir)) rmSync(workDir, { recursive: true });
  for (const entry of entries) {
    const dir = join(workDir, entry.slug);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'index.html');
    writeFileSync(path, await format(renderPage(works.get(entry.slug), entry.group, entry.no), path));
  }

  writeFileSync(sitemapPath, renderSitemap(entries));

  const drafts = [...works.keys()].filter((slug) => !entries.some((e) => e.slug === slug));
  console.log(
    `✓ ${entries.length} works published${drafts.length ? `, drafts: ${drafts.join(', ')}` : ''}`
  );
}

main().catch((err) => {
  console.error(err instanceof ContentError ? `✗ ${err.message}` : err);
  process.exit(1);
});
