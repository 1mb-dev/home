#!/usr/bin/env node

/**
 * Build script for 1mb.dev
 *
 * CI-only stamp, not committed. Content generation is scripts/gen.js, which must stay
 * deterministic, so everything that depends on the clock or on history is stamped here:
 *   - commit SHA into the Service Worker cache version (every deploy invalidates the cache)
 *   - sitemap <lastmod> from the git log of each page's content (needs full history in CI)
 *   - security.txt Expires, one year from the deploy
 */

import { readFileSync, realpathSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Tests the match, not the output: a stamp can equal what it replaces.
export function stamp(text, pattern, replacement, what) {
  if (text.search(pattern) === -1) throw new Error(`${what}: nothing to stamp`);
  return text.replace(pattern, replacement);
}

// Get git commit SHA (short)
function getCommitSha() {
  return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
}

// Inject version into Service Worker
function updateServiceWorker(sha) {
  const swPath = join(ROOT, 'docs', 'sw.js');
  let content = readFileSync(swPath, 'utf8');

  // Replace cache name pattern: '1mb-v4' or '1mb-abc1234' -> '1mb-{sha}'
  content = stamp(
    content,
    /const CACHE_NAME = '1mb-[^']+'/,
    `const CACHE_NAME = '1mb-${sha}'`,
    'docs/sw.js'
  );

  writeFileSync(swPath, content);
  console.log(`✓ Service Worker cache version: 1mb-${sha}`);
}

// <lastmod> = last commit touching the content a page is generated from. No history, no date:
// a missing lastmod is honest, a guessed one is not.
function updateSitemap() {
  const path = join(ROOT, 'docs', 'sitemap.xml');
  const sources = (loc) => {
    const slug = /\/work\/([a-z0-9-]+)\/$/.exec(loc)?.[1];
    return slug ? [`content/work/${slug}.md`] : ['docs/index.html', 'content/index.txt'];
  };
  let stamped = 0;
  const xml = readFileSync(path, 'utf8').replace(/<loc>([^<]+)<\/loc>/g, (match, loc) => {
    let date = '';
    try {
      date = execSync(`git log -1 --format=%cs -- ${sources(loc).join(' ')}`, {
        cwd: ROOT,
        encoding: 'utf8',
      }).trim();
    } catch {
      // no git: leave the URL undated
    }
    if (!date) return match;
    stamped += 1;
    return `${match}<lastmod>${date}</lastmod>`;
  });
  writeFileSync(path, xml);
  console.log(`✓ Sitemap lastmod: ${stamped} URLs`);
}

function updateSecurityTxt(now) {
  const path = join(ROOT, 'docs', '.well-known', 'security.txt');
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  const content = stamp(
    readFileSync(path, 'utf8'),
    /^Expires: .*$/m,
    `Expires: ${expires.toISOString()}`,
    'docs/.well-known/security.txt'
  );
  writeFileSync(path, content);
  console.log(`✓ security.txt Expires: ${expires.toISOString()}`);
}

// Importing this file must not stamp the tree. realpath: a symlinked path must still build.
if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sha = getCommitSha();
  console.log(`Building 1mb.dev (${sha})...\n`);

  const now = new Date();
  updateServiceWorker(sha);
  updateSitemap();
  updateSecurityTxt(now);

  console.log('\n✓ Build complete');
}
