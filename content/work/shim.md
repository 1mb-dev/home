---
name: shim
tagline: A Claude Code proxy that logs its edits
description: A local proxy that runs Claude Code on DeepSeek, OpenAI, OpenRouter or Ollama, logging its rewrites and measuring every request. One Go binary.
tags: claude code, llm proxy, deepseek, openrouter, ollama, go
source: https://github.com/1mb-dev/shim
docs: https://shim.1mb.dev
language: Go
shipped: 2026-05-25
listed: 2026-10-30
---

One Go binary on `127.0.0.1:8082`. Point Claude Code at it with `ANTHROPIC_BASE_URL` and its calls go to DeepSeek, OpenAI, OpenRouter or Ollama, or pass through to Anthropic. With the proxy up, `shim run` starts Claude Code pointed at it.

`/v1/metrics` reports latency, token drift and rewrites. The four translated providers reply in one burst, not token by token.

## Why it exists

Claude Code sends Anthropic Messages calls. A model behind OpenAI ChatCompletions cannot answer them.

shim translates between the two, so the upstream model changes and Claude Code stays the harness.

## What it taught

A proxy should not change traffic silently. A model rename, or a stop-sequence list cut to four, is logged and counted. A block that shim cannot translate returns a 400 that names it.

`/v1/messages/explain` shows both rewrites with no upstream running.

## Related

[Measurement](https://shim.1mb.dev/measurement.html)
