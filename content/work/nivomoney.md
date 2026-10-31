---
name: nivomoney
tagline: A neobank, opened up to be read
description: Neobank demo source: Go microservices, a double-entry ledger in Postgres, React apps, ADRs. Synthetic data, no real money.
tags: neobank, double-entry ledger, go, microservices, fintech
site: https://nivomoney.1mb.dev
source: https://github.com/1mb-dev/nivomoney
retired: true
shipped: 2025-11-21
listed: 2026-10-30
---

A neobank demo in Go: identity, wallets, transactions, risk and a double-entry ledger, each its own service, with React apps on the front. All data is synthetic.

Eight services and a gateway. Decisions are written up as ADRs.

## Why it exists

Tutorials stop at one service and one database. Money integrity, audit trails and fraud limits sit past that point.

nivomoney was built to go there: the core systems of a bank, small enough to follow.

## What it taught

The source lays out a bank's parts: where service boundaries fall, how a double-entry ledger works, what moving money across services asks for.

A balance rule belongs in the database. Postgres refuses to post an entry of 100 against 90.

The wiring from transfers to that ledger is where the demo stopped.

## Related

[Why double entry](https://nivomoney.1mb.dev/adr/001-double-entry-ledger)
