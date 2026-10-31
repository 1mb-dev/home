#!/usr/bin/env node

/**
 * Generate the work index from content/.
 *
 * Deterministic: same content in, same docs/ out. Output is committed and CI fails
 * when it is stale (run `npm run gen`). Writes:
 *   docs/index.html          blocks between <!-- gen:{work,colophon}:start/end -->
 *   docs/404.html            blocks between <!-- gen:{masthead,colophon}:start/end -->
 *   docs/work/{slug}/        one page per listed work (directory rebuilt each run)
 *   docs/sitemap.xml
 *   docs/feed.xml            Atom feed of listed works by listing date
 *   docs/llms.txt            the index as plain Markdown
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as prettier from 'prettier';
import {
  ContentError,
  assertNoEmDash,
  bridgeLinked,
  isText,
  checkDurable,
  parseIndex,
  parseWork,
  renderColophon,
  renderFeed,
  renderIndex,
  renderLlms,
  renderMasthead,
  renderPage,
  renderSitemap,
  sitemapLocs,
  validateCollection,
} from './work.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const DOCS = join(ROOT, 'docs');

// Replace the content between <!-- gen:{name}:start --> and <!-- gen:{name}:end -->.
function replaceBlock(html, name, content, file) {
  const start = `<!-- gen:${name}:start -->`;
  const end = `<!-- gen:${name}:end -->`;
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i === -1 || j === -1 || j < i) throw new Error(`${file}: missing ${start} ... ${end}`);
  return `${html.slice(0, i)}${start}\n${content}\n${html.slice(j)}`;
}

function* textFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* textFiles(path);
    else if (isText(entry.name)) yield path;
  }
}

// Every file gen writes passes through here, so the em-dash ban covers hand-written pages too.
async function format(source, filepath) {
  const options = await prettier.resolveConfig(filepath);
  const out = await prettier.format(source, { ...options, filepath });
  assertNoEmDash(out, filepath.slice(ROOT.length + 1));
  return out;
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

  // Hand-written files too (manifest, txt, CSS, SW, SVG): the rule covers every string the site serves.
  for (const path of textFiles(DOCS)) {
    assertNoEmDash(readFileSync(path, 'utf8'), path.slice(ROOT.length + 1));
  }

  const sitemapPath = join(DOCS, 'sitemap.xml');
  checkDurable(sitemapLocs(readFileSync(sitemapPath, 'utf8')), entries);

  const indexPath = join(DOCS, 'index.html');
  let index = readFileSync(indexPath, 'utf8');
  index = replaceBlock(index, 'work', renderIndex(entries, works), 'docs/index.html');
  index = replaceBlock(index, 'colophon', renderColophon(), 'docs/index.html');
  writeFileSync(indexPath, await format(index, indexPath));

  const notFoundPath = join(DOCS, '404.html');
  let notFound = readFileSync(notFoundPath, 'utf8');
  notFound = replaceBlock(notFound, 'masthead', renderMasthead(), 'docs/404.html');
  notFound = replaceBlock(notFound, 'colophon', renderColophon(), 'docs/404.html');
  writeFileSync(notFoundPath, await format(notFound, notFoundPath));

  const workDir = join(DOCS, 'work');
  if (existsSync(workDir)) rmSync(workDir, { recursive: true });
  for (const [i, entry] of entries.entries()) {
    const dir = join(workDir, entry.slug);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'index.html');
    const page = renderPage(works.get(entry.slug), entry, {
      prev: entries[i - 1] ?? null,
      next: entries[i + 1] ?? null,
      works,
    });
    writeFileSync(path, await format(page, path));
  }

  writeFileSync(sitemapPath, renderSitemap(entries));

  const description = /<meta\s+name="description"\s+content="([^"]+)"/.exec(index)?.[1];
  if (!description)
    throw new Error('docs/index.html: missing meta description (the feed subtitle)');
  const feed = renderFeed(entries, works, description);
  assertNoEmDash(feed, 'docs/feed.xml');
  writeFileSync(join(DOCS, 'feed.xml'), feed);

  const llms = renderLlms(entries, works, description);
  assertNoEmDash(llms, 'docs/llms.txt');
  writeFileSync(join(DOCS, 'llms.txt'), llms);

  const drafts = [...works.keys()].filter((slug) => !entries.some((e) => e.slug === slug));
  console.log(
    `✓ ${entries.length} works published${drafts.length ? `, drafts: ${drafts.join(', ')}` : ''}`
  );
  if (bridgeLinked(entries)) {
    console.log('! bridge links to the sides: a side passed 12 rows or the index reached 16 works');
  }
}

main().catch((err) => {
  console.error(err instanceof ContentError ? `✗ ${err.message}` : err);
  process.exit(1);
});
