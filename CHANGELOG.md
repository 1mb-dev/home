# Changelog

All notable changes to 1mb.dev will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- The cover's counter closes in two lines, and a vote says how many others are in

### Fixed

- `try again` keeps keyboard focus, and a late count no longer undoes a vote
- The cover's separator sits on the axis
- `llms.txt` marks a retired or unmaintained work

### Removed

- `npm run worker:deploy`: the worker deploys from CI
- The bridge's links to the sides at 16 works: no reader could see them

## [2.0.1] - 2026-11-01

### Added

- `llms.txt`, generated with the rest of the site

### Changed

- Deploys run on a release tag or a manual run, not on a merge
- Counter API moves to `counter.1mb.dev`
- Tests run on `@cloudflare/vitest-plugin`, which takes the dev audit from 13 findings to 5 moderate

### Security

- Tests run without the deploy token, and the build job installs nothing
- Release tags cannot be moved or deleted
- CSP allows Cloudflare's analytics beacon. Cloudflare's inline challenge script stays blocked

## [2.0.0] - 2026-10-31

### Added

- Index of works by side (use, read, build with), a page per work, and twelve works listed
- `content/` and `scripts/gen.js`: pages, feed and sitemap generated from flat files, and committed
- Atom feed, `security.txt`, private vulnerability reporting
- `hi@1mb.dev` in the footer

### Changed

- Cover rewritten as the manifesto, with one design language across every page
- Hosting moves from GitHub Pages to Cloudflare Pages, deployed from CI behind validate and test
- CSP and security headers in `docs/_headers`
- The footer no longer carries a year

### Fixed

- Counter: CORS matches whole origins, one vote per IP holds under parallel requests, Redis calls time out
- Service worker: pages, CSS and JS are network-first, so a deploy shows on the next load
- Theme: returning visitors follow the system until they choose

## [1.2.0] - 2026-01-02

### Added

- MIT LICENSE file
- `.nvmrc` for Node.js version consistency
- CHANGELOG.md for release tracking
- CI pipeline with ESLint, Prettier, HTML/CSS validation
- GitHub Actions deployment with auto SW versioning (git SHA)
- humans.txt with project philosophy
- Counter API `/health` endpoint with Redis connectivity check
- Wrangler CLI setup for Counter API deployment
- workers/README.md with setup guide
- Development section in README

### Changed

- Refactored 404.html to use shared stylesheet (171 → 35 lines)
- Improved semantic markup: `<hr>` for separator, `<section>` for counter
- Added `meta author` tag and `type="button"` attributes
- Updated manifest description for consistency
- Added `site.webmanifest` to Service Worker cache
- Updated Wrangler to v4.54.0 with proper secrets management
- Updated humans.txt: Zed, Vim as editors

## [1.1.0] - 2025-01

### Added

- Context section: "Sometimes solo. Sometimes inside a team. Always accountable."
- Invitation line bridging manifesto and counter
- Community counter with anonymous voting
- Dark/light theme toggle with system preference detection
- Parallax effect on watermark (respects reduced motion)
- Service Worker for offline support
- PWA manifest for mobile installation

### Changed

- Refined copy to ownership mindset
- Updated og-image with current style and copy
- UI refresh: typography, spacing, visual depth
- Reorganized assets into proper folder structure

## [1.0.0] - 2024-12

### Added

- Initial landing page
- Brand assets and SEO markup
- GitHub Pages deployment with custom domain (1mb.dev)
- robots.txt and sitemap.xml
- Self-hosted fonts (Inter, Space Grotesk)
