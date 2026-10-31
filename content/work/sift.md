---
name: sift
tagline: Hacker News threads, scored by code
description: Hacker News discussions picked by a scoring script with no editor: up to 12 threads, several runs a day, one per domain. No account, no archive.
tags: hacker news, digest, discussions, comments, rss
site: https://sift.1mb.dev
shipped: 2026-02-22
listed: 2026-10-31
---

A digest of Hacker News discussions. Code scores each thread, mostly from its comments, and lists up to twelve, one per domain, with no editor.

A story needs over 30 comments and over 100 points to enter, or over 50 points for Ask and Show HN, so a quiet thread never does. The list is rebuilt several times a day, and a failed run leaves the last one up.

It costs nothing to read or to run. No account, no cookies, no archive: each list replaces the one before. The same list is an RSS feed.

## Why it exists

Hacker News ranks stories by votes. Whether the comments are worth reading is a separate question, and finding out means opening threads one by one.

sift answers it with fixed rules, then stops at twelve.

## What it taught

sift was built to rank by discussion, but its rule for repeats can outweigh that. A repeat is multiplied by 0.7, a new thread by 1.15.

On one run, the twelve picks scored within 12% of each other.

## Related

[How it works](https://sift.1mb.dev/about/)
