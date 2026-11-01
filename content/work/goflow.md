---
name: goflow
tagline: Go rate limiters, worker pools, cron
description: A Go concurrency library: token and leaky bucket rate limiters, worker pools, cron scheduling, pipelines and streams with backpressure. Needs Go 1.26. MIT.
tags: golang, rate limiter, worker pool, cron scheduler, concurrency, backpressure
source: https://github.com/1mb-dev/goflow
docs: https://1mb-dev.github.io/goflow/
language: Go
shipped: 2025-08-27
listed: 2026-11-01
---

Rate limiting, task scheduling and streaming in one Go library. Token bucket, leaky bucket and concurrency limiters. Worker pools, pipelines, and a scheduler that takes intervals or six-field cron, seconds included. Streams with four backpressure strategies.

A token bucket at rate 10 and burst 20 lets 20 through at once, then 10 a second.

Shutdown lets running tasks finish. Queued tasks can be dropped, with no error.

## Why it exists

A project needed a token bucket, a worker pool and a scheduler.

goflow makes them primitives to import.

## What it taught

A library can say when not to use it. The README sends a reader with one need to a single-purpose library, and to `sync.WaitGroup` and channels when those are enough.

## Related

[When to use goflow](https://1mb-dev.github.io/goflow/docs/guides/decision-guide/)
[markgo, which runs its cleanups on the scheduler](/work/markgo/)
