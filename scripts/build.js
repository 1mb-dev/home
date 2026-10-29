#!/usr/bin/env node

/**
 * Build script for 1mb.dev
 *
 * CI-only stamp: injects the git commit SHA into the Service Worker cache version,
 * so every deploy invalidates the cache. Not committed; content generation is scripts/gen.js.
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

// Main
const sha = getCommitSha();
console.log(`Building 1mb.dev (${sha})...\n`);

updateServiceWorker(sha);

console.log('\n✓ Build complete');
