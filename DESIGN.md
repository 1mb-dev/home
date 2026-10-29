# 1mb Design Language

**Version:** 0.1.0
**Last updated:** 2026-10-29
**Source of truth for values:** `docs/assets/css/style.css` (tokens on `:root`). This file holds the why.

## Overview

1mb.dev is a manifesto with the work beneath it. A one-man-band plays every part on the record, so the site is built like one: the hero is the cover, the index is the track listing, each work page is the liner notes, and every page ends on the credit. The feeling is a sleeve on a shelf: quiet, typographic, owned. Nothing on it asks for attention it has not earned.

## Readers

| Reader                                       | Wants                                     | Constraint                                      |
| -------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| Arriving from a link (post, HN, hiring look) | What 1mb is, then the thing, in one click | Often on a phone, often skimming                |
| The owner, publishing                        | One durable address per work              | Adds a work with a content change, not a layout |

Implications: core content renders without JavaScript; the root row's name goes to the 1mb page, its verb goes straight to the product; a work's address never changes with its status.

## The expression: a record

| Part            | Device                                                                  | Where                |
| --------------- | ----------------------------------------------------------------------- | -------------------- |
| **Cover**       | Manifesto, invitation, counter as one unit. One faint numeral behind it | Root hero            |
| **Sides**       | Groups named by the reader's action: use, read, build with              | Root index           |
| **Tracks**      | Number, title, dotted leader, verb, tagline beneath                     | Root index           |
| **Numbering**   | Runs across sides, `01` onward, tabular figures                         | Index and work pages |
| **Liner notes** | Track number and side, title, tagline, notes, status, next              | `/work/{slug}/`      |
| **Credit**      | "All the hats. One head." closes every work page                        | Colophon             |

The watermark numeral is the only image. `1` behind the cover, `0` behind the 404. Work pages carry none: notes are for reading.

## Principles (in order)

1. **The manifesto leads.** The work is the proof beneath it, never the headline above it.
2. **Typography is the interface.** Two faces, one ink, one paper. No icons, images, colour accents or illustrations carry meaning.
3. **Quiet by default.** Live work shows no status. Private source shows nothing. One filled control per page.
4. **Readable without script.** HTML first; JavaScript adds the counter, theme and offline, nothing else.
5. **Every element earns its place.** If deleting it loses the reader nothing, it goes.

## Voice

1MB register: short sentences, no I or we, ends with weight. Copy describes the work and the problem, never the author.

**Interface labels** are lowercase verbs or nouns, plain: `count me in`, `open`, `read`, `get {name}`, `source`, `docs`, `all work`, `back to building`.

**Status is sentences, never badges:**

| Fact (from content)       | Page says                                        | Index says     |
| ------------------------- | ------------------------------------------------ | -------------- |
| Live                      | nothing                                          | nothing        |
| `retired: true` with site | No longer running. The write-up stays at {host}. | `retired`      |
| `source` set              | Source is public.                                | nothing        |
| `maintained: true`        | Source is public, and kept current.              | nothing        |
| `maintained: false`       | Source stays public. No longer maintained.       | `unmaintained` |
| Private source            | nothing, anywhere                                | nothing        |

Upkeep is an editorial claim: it appears only when a content file states it.

## Tokens

Defined in `style.css`; listed here for intent.

| Kind    | Tokens                                                              | Intent                                                       |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| Ink     | `--fg`, `--muted`                                                   | Two levels of emphasis are enough. Muted ≥ 5.1:1 both themes |
| Paper   | `--bg`, `--surface`, `--border`                                     | Surface only for `code`; border only for the separator dots  |
| Type    | `--font-display` (Space Grotesk 700), `--font-body` (Inter 400–600) | Display for the mark and titles only                         |
| Size    | `--text-sm` 14 → `--text-3xl` 40                                    | 14px floor for text                                          |
| Space   | `--space-1` 8 → `--space-8` 64, 8pt grid                            | Sections breathe; rows stay tight                            |
| Measure | 480px column everywhere                                             | ~60 characters; the cover and the notes share one spine      |

No accent colour. Monochrome is the brand.

## Vocabulary

| Name      | Class                                | Is                                                                   |
| --------- | ------------------------------------ | -------------------------------------------------------------------- |
| Hero      | `.hero`                              | The cover unit; 88svh so side one shows at the fold                  |
| Watermark | `.hero::before`, `.page-404::before` | The one numeral, 4% ink                                              |
| Separator | `.separator`                         | `· · ·`, the only divider                                            |
| Side      | `.side`                              | A group heading: lowercase, tracked, muted                           |
| Track     | `.track`                             | One work row: `-no`, `-name`, `-state`, `-lead`, `-verb`, `-tagline` |
| Notes     | `.notes`                             | A work page: `-no`, `-tagline`, `-body`, `-status`, `-next`          |
| Action    | `.action`                            | The one filled control on a page                                     |
| Mark      | `.mark`                              | `1mb` in display face, links home                                    |
| Colophon  | `.colophon`                          | The credit line and the way back                                     |

Labels inside notes (`why it exists`, `what it taught`, `related`) share the side style: one heading voice across the site.

## Constraints: what 1mb does not do

- No cards, shadows, gradients, glass, or hover lift.
- No pills, badges, coloured status, or traffic lights.
- No icons or emoji in content. The theme toggle's ☀/☾ is the one glyph control.
- No screenshots, hero images, or per-work artwork. One shared social image.
- No motion beyond a 0.2s opacity or colour change on hover. No parallax.
- No hover-only information. No arrows on rows; the underline is the affordance.
- No centred lists. Centre the cover, left-align anything scanned.
- No featured slots, counts, stars, dates or activity pulled from GitHub.
- No infinite lists, no "explore", no exclamation marks.
- No new token for a single use.

## Content format

`content/index.txt` decides what is listed, in which side, in what order. `content/work/{slug}.md` holds one work: flat front matter, then the synopsis, `## Why it exists`, optional `## What it taught` and `## Related`. Inline: links, `*emphasis*`, `` `code` ``. Anything else fails the build with file and line. `npm run gen` writes `docs/`; CI fails when the output is stale.

A file not listed in `index.txt` is a draft. Works enter the index one at a time, after the owner has read the copy and every status claim it makes.

## Considered, not taken

| Direction                                     | Why not                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Card grid with screenshots                    | Stock. Images go stale, cards compete with the manifesto               |
| Ledger: columns for name, kind, status, links | Reads as a dashboard; columns collapse badly on phones; status-forward |
| Grouping by hat (maker, writer, engineer)     | Author-centred; the reader's action is the useful axis                 |
| Track number as a watermark on work pages     | Competes with the notes; the numeral belongs to the cover              |
| Constellation or orbit map of works           | Decoration over information; out of scope in the brief                 |

## Decision log

| Date       | Decision                                        | Rationale                                                                |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| 2026-10-29 | The record as the organising metaphor           | One-man-band is a musical idea; a track listing is a native, quiet index |
| 2026-10-29 | Sides = use / read / build with                 | Named for the reader's first action, not the technology                  |
| 2026-10-29 | Dotted leaders between title and verb           | The sleeve's device; ties name to action without arrows or columns       |
| 2026-10-29 | Watermark only on the cover and 404, now static | Parallax removed; a still numeral is still the brand                     |
| 2026-10-29 | `.action` shared by 404 and work pages          | One filled control, one definition                                       |
| 2026-10-29 | Status as sentences; upkeep only when stated    | Editorial, never derived; silence for live work and private source       |

## Evolving this

Change the reason here before changing the value in CSS. New component: name it in Vocabulary first. New constraint: say what it prevents. Version: patch for clarifications, minor for new parts, major when a part is renamed or removed.
