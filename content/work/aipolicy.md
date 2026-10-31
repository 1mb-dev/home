---
name: aipolicy
tagline: A repository's AI policy, as files.
description: An AI policy generator for a repository: pick a preset, set the rules for contributors, download AI_POLICY.md, AGENTS.md and more. No install, no sign-up.
tags: ai policy, agents.md, claude.md, policy generator
site: https://aipolicy.1mb.dev
source: https://github.com/1mb-dev/aipolicy
shipped: 2026-03-21
listed: 2026-10-30
---

An AI policy generator for a repository. Pick a preset and get `AI_POLICY.md`, `AGENTS.md`, `CLAUDE.md` and the Copilot and Cursor files, written from one set of choices. No install, no sign-up.

Open welcomes AI tools. Standard requires human review. Strict restricts them and asks for explicit approval.

Every option can change, the training data opt-out and restricted paths among them, and the choices travel in the URL. Each preset's files are also there for `curl`.

## Why it exists

Projects disagree on whether AI assistance is allowed, accepted or a stigma. A repository that says nothing leaves contributors to guess.

aipolicy makes it an informed call, in a standard form. CloudNativePG, Kyverno and Kubewarden each publish a policy of their own.

## What it taught

aipolicy set out to show that the position comes first and the files follow. One choice changes the policy section by section. Strict reads "AI-generated code is not accepted."

The repository's own `AI_POLICY.md` and `AGENTS.md` were generated with its Standard preset.

## Related

[The Strict policy, as served](https://aipolicy.1mb.dev/presets/strict/AI_POLICY.md)
