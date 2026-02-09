#!/usr/bin/env node

/**
 * Build script for 1mb.dev
 *
 * Injects git commit SHA into Service Worker cache version.
 * This ensures cache invalidation on every deploy.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Get git commit SHA (short)
function getCommitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    // Fallback to timestamp if git is not available
    return Date.now().toString(36);
  }
}

// Inject version into Service Worker
function updateServiceWorker(sha) {
  const swPath = join(ROOT, 'docs', 'sw.js');
  let content = readFileSync(swPath, 'utf8');

  // Replace cache name pattern: '1mb-v4' or '1mb-abc1234' -> '1mb-{sha}'
  content = content.replace(
    /const CACHE_NAME = '1mb-[^']+'/,
    `const CACHE_NAME = '1mb-${sha}'`
  );

  writeFileSync(swPath, content);
  console.log(`✓ Service Worker cache version: 1mb-${sha}`);
}

// Update sitemap lastmod date
function updateSitemap(date) {
  const sitemapPath = join(ROOT, 'docs', 'sitemap.xml');
  let content = readFileSync(sitemapPath, 'utf8');

  content = content.replace(
    /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/,
    `<lastmod>${date}</lastmod>`
  );

  writeFileSync(sitemapPath, content);
  console.log(`✓ Sitemap lastmod: ${date}`);
}

// Main
const sha = getCommitSha();
const today = new Date().toISOString().slice(0, 10);
console.log(`Building 1mb.dev (${sha})...\n`);

updateServiceWorker(sha);
updateSitemap(today);

console.log('\n✓ Build complete');
