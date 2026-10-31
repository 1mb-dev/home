---
name: gist
tagline: App specs for AI coding assistants.
description: An app spec generator for AI coding assistants: describe an app idea, answer a few questions, download a markdown spec to start from. No account.
tags: app spec, spec generator, ai coding, markdown, app idea
site: https://gist.1mb.dev
source: https://github.com/1mb-dev/gistapp
shipped: 2026-02-23
listed: 2026-10-30
---

Describe an app idea, answer questions about its data, scale, hosting and design, and download a markdown spec for an AI coding assistant. It is a better starting point, not a full build spec. The build iterates from there.

A personal single-page app gets plain HTML, CSS and JS with no build step. A public site with hourly data gets a Worker, KV and cron. Each spec has an implementation order with checkpoints, and a suggested prompt.

Answers stay in the browser. A share link keeps the spec on the server for 90 days.

## Why it exists

An AI coding assistant starts from what it is told. An app idea leaves out free-tier limits, caching and CORS proxies, and most people with an idea do not know to state them.

gist asks the questions and writes the constraints down.

## What it taught

A small idea gets a small spec. gist starts at minimal and scales up only on specific answers.

The rules are in `src/lib/complexity.ts`.

## Related

[Privacy](https://gist.1mb.dev/privacy)
[aipolicy, the rules for assistants in the repo](/work/aipolicy/)
