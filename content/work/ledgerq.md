---
name: ledgerq
tagline: A message queue in a directory
description: An embedded Go message queue: a persistent, disk-backed log in a directory. No broker, one process, one read position, zero dependencies.
tags: message queue, go, embedded, disk-backed, zero dependencies
source: https://github.com/1mb-dev/ledgerq
docs: https://pkg.go.dev/github.com/1mb-dev/ledgerq/pkg/ledgerq
language: Go
shipped: 2025-10-17
listed: 2026-10-31
---

A Go library. Give it a path and messages go to an append-only log on disk, with no broker to run.

One process, one read position. On an i5 laptop: about 200,000 writes a second buffered, 27 with `AutoSync`, which puts each one on disk before it returns. Reads run at about 80 a second.

After a hard kill the log reopens at its last complete entry. Buffered writes can be lost; `AutoSync` prevents that.

## Why it exists

Kafka and RabbitMQ need separate processes and network setup. In-memory channels lose their data when the process exits. A database queue adds a dependency and polling.

Background tasks that outlive a restart, edge devices and CI runners need a queue with none of those costs.

## What it taught

Three features were refused for what they would bring in. Consumer groups need networking, transactions need two-phase commit, an HTTP API adds a dependency.

`go.mod` has no `require`.

## Related

[Recovery and durability](https://github.com/1mb-dev/ledgerq/blob/main/docs/ARCHITECTURE.md#recovery-and-durability)
