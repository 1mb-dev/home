---
name: ledgerq
tagline: A durable queue that lives on one disk.
source: https://github.com/1mb-dev/ledgerq
docs: https://pkg.go.dev/github.com/1mb-dev/ledgerq/pkg/ledgerq
shipped: 2025-10-17
listed: 2026-10-30
---

Messages go to an append-only log and survive a crash.

No network. No cluster. Nothing beyond Go's standard library.

## Why it exists

Not every queue needs a cluster. A CLI tool, an edge device, a desktop app: each needs tasks that outlive a restart.

Running Kafka for that is ceremony.

## What it taught

Feature-complete at `v1.4.0`, on purpose. It does one job and stopped growing.

Knowing when it is done is part of the design.
