---
name: markgo
tagline: A blog engine in one Go binary
description: A flat-file Go blog engine: markdown files in a directory, a web compose form, one binary with embedded assets. No database, no build step.
tags: blog engine, go, markdown, flat-file, single binary, no database
source: https://github.com/1mb-dev/markgo
docs: https://github.com/1mb-dev/markgo/blob/main/docs/GETTING-STARTED.md
language: Go
maintained: true
shipped: 2025-09-04
listed: 2026-10-30
---

Posts are markdown files in a directory. `markgo serve` puts them on the web with search and feeds, from one binary with its web assets embedded.

A post needs no type. No title and under a hundred words makes a thought. A link field makes a link. Anything else is an article.

Set an admin login and a compose form writes the same files, published at once. An edit made on disk shows after a restart.

## Why it exists

A static site generator has the files and no server. A hosted platform has the server and keeps the files.

markgo keeps the files on disk and runs the server.

## What it taught

markgo shows that a blog can be markdown files in a directory and a compose form, in one binary, with no database and no build step.

`markgo init --quick`, then `markgo serve`, and a blog is on port 3000.

## Related

[log, the reference implementation](/work/log/)
