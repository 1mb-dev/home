# Adding a work

`index.txt` decides what is listed, in which side, in what order. `work/{slug}.md` holds one work: flat front matter (`name`, `tagline`, `description`, `tags`, `site`, `source`, `docs`, `language`, `retired`, `maintained`, `shipped`, `listed`), then the synopsis, `## Why it exists`, optional `## What it taught` and `## Related`. Inline: links and `` `code` ``. Anything else fails the build with file and line, `*` and `_` included: `snake_case` goes in a code span.

To add a work: write `work/{slug}.md`, check it reads well as a draft, list the slug in `index.txt`, run `npm run gen`, commit `content/` and `docs/` together. CI fails when `docs/` is stale. A merge does not publish: a manual CI run on main or a `v*` tag does.

Copy follows [design.md](../design.md#voice), field by field.

A file not listed in `index.txt` is a draft. A work is listed only when the maker has approved its copy and every status claim it makes. Once listed, a work's page never disappears; retire it instead.

A work links to its `{name}.1mb.dev` address where one exists, even while that address redirects to another domain.

Within a side, the work most useful to a reader with no context comes first; retired and unmaintained works come last. No side launches or stays at a single row: one row reads as a stub.

A listed work needs `description`, `tags` and two dates, both set by hand. `shipped: YYYY-MM-DD` is its go-live date: the first release or tag, the first commit, or a hand pick. `listed: YYYY-MM-DD` is the day it joins the index and dates the feed. It may not precede `shipped`.

## In search

- **Title:** `{name}: {tagline} · 1mb`, 70 characters at most, so a search result says what the work is.
- **Description:** written by hand as `description:`, 70 to 160 characters. A work cannot list without it. It earns the click with the category and the limit, not with a pitch.
- **Tags:** `tags:`, three to six, lowercase. A work cannot list without them. Never shown on the page. Tags do not rescue copy that never says the words a searcher uses.
