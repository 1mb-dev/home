# 1mb Design Language

**Version:** 0.7.5
**Last updated:** 2026-10-30
**Source of truth for values:** `docs/assets/css/style.css` (tokens on `:root`). This file holds the why.

## Overview

1mb.dev is a manifesto with the work beneath it, built like a record: the hero is the cover, the index is the track listing, each work page is the liner notes, and every page ends on the credit. The feeling is a sleeve on a shelf: quiet, typographic, owned. Nothing on it asks for attention it has not earned.

## Readers

| Reader                                       | Wants                                     | Constraint                       |
| -------------------------------------------- | ----------------------------------------- | -------------------------------- |
| Arriving from a link (post, HN, hiring look) | What 1mb is, then the thing, in one click | Often on a phone, often skimming |
| The owner, publishing                        | One durable address per work              | A content change, not a layout   |
| The next maintainer                          | To add a work without reading the build   | See "Content format"             |

Every work page stands alone for a reader with no context. The row's name goes to the 1mb page; its verb goes straight to the product. A work's address never changes with its status.

## The expression: a record

| Part            | Device                                                                                              | Where           |
| --------------- | --------------------------------------------------------------------------------------------------- | --------------- |
| **Cover**       | The `1mb` capstone, manifesto, invitation, counter. The watermark behind                            | Root hero       |
| **Bridge**      | "Use it. Read it. Build with it." names the sides                                                   | Top of index    |
| **Sides**       | Groups named by the reader's action: use, read, build with                                          | Root index      |
| **Tracks**      | Number, title, dotted leader, verb, tagline beneath. Same on every side                             | Root index      |
| **Liner notes** | Side, title, tagline, notes, status, next                                                           | `/work/{slug}/` |
| **Sequence**    | Previous and next work, each with its tagline, in index order                                       | Work pages      |
| **Credit**      | `1mb ·` \| "All the hats. One head." \| toggle; beneath the credit: `github`, `log`, `feed`, © year | Every page      |

**The watermark `1` is the signature.** A semi-visible presence (the `--watermark` token: 4% ink light, 6% dark) behind the cover and behind the notes on each work page. One per page: the index has none, so the cover's `1` stays the home page's only one. The 404 carries a `0` the same way. On a fine pointer it drifts up to 8px against the cursor and eases home when the cursor leaves. Refine it; never remove or demote it.

**The capstone anchors the cover.** `1mb` in the display face at 56px tops the root. Inner pages carry the same mark, small, top centre: the one constant at the top of every page.

Numbering is for the index only. It follows `content/index.txt` order and changes when that order changes, so it never appears on a work page or in a URL.

## Principles (in order)

1. **The manifesto leads.** The work is the proof beneath it, never the headline above it.
2. **Typography is the interface.** Two faces, one ink, one paper. No icons, images, colour accents or illustrations carry meaning.
3. **Quiet by default.** Live work shows no status. Private source shows nothing. One filled control per page.
4. **Predictable.** Every page ends the same way, and the top is always the mark, large on the cover and small elsewhere. Things are where they were on the last page.
5. **Readable without script.** HTML first; JavaScript adds the counter, theme, offline and the watermark's drift, nothing else.
6. **Every element earns its place.** If deleting it loses the reader nothing, it goes.

## Navigation

Same structure on every page: root, work pages, 404. `scripts/gen.js` writes the masthead and colophon into all of them from one template, so they cannot drift.

1. **Top:** the `1mb` mark, top centre, links home. On the root it is the capstone; elsewhere the small `.mark`. Nothing else sits at the top.
2. **Sequence:** work pages only, after the notes. Previous left, next right, each a block with label, name and tagline. In index order, no wrap: at an end, that side is empty. Stacks on phones. Below it, `all work` returns to the index.
3. **Bottom:** the colophon, two lines on a three-column grid, the same on every page. Line 1: `1mb ·` (links home), "All the hats. One head.", the theme toggle at the right. Line 2, under the credit and aligned with it: `github`, `log`, `feed`, then © year last, as the sign-off. Nothing sits under the mark. On the root the credit repeats the cover on purpose: the back of the sleeve.
4. **Theme toggle:** the colophon's right column, first line, on every page. Ships `hidden`; `theme.js` reveals it. Without JS it is absent. It reports `aria-pressed` (pressed = dark).
5. **Names:** home is `1mb`, the list is `all work`. The 404's one action is `back to 1mb`.
6. **Links open in the same tab**, outbound included. The reader decides about new tabs; a forced one breaks Back and needs a warning to be accessible.

## Voice

1MB register: short sentences, no I or we, ends with weight: the last line lands on a fact a stranger can check, not a maxim. Copy describes the work and the problem, never the author. The name "one-man-band" lives in page titles and metadata; the visible page does not repeat it.

**No em-dashes.** Not in copy, titles, metadata or interface strings. Use a full stop, a comma, a colon or a middle dot (`sift · 1mb`). The build enforces it: `parseWork` rejects a content file containing one, and `gen` refuses to write a page or script that does.

**No time words.** `currently`, `now`, `recently`, `today`, `latest` and `these days` go stale on a page nobody re-dates. `parseWork` rejects them outside code spans and link targets. Status comes from front matter, and a live site says nothing.

**Every piece of copy gets two passes before it ships:** the author's own pass for tells and bloat, then a reviewer's pass against this section. New copy, edited copy and interface strings alike.

**Work copy, field by field.** The reviewer's pass checks each work against this.

| Field          | Says                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| Tagline        | What the work is, not what it is like, in one sentence. Aim for 36 characters |
| Synopsis       | What it does, with a number or a name. No status, no author                   |
| Why it exists  | The problem specific to this work                                             |
| What it taught | Only what the owner learned; without that, the section is left out            |

Status lives in front matter, and the body never restates it. A page carries at most one contrast line ("not X, but Y") and borrows no run of fragments from another listed work. Before listing, the owner checks every claim, and a stranger with no context can follow the page.

**Interface labels** are lowercase in the source: `count me in`, `you're in`, `try again`, `open`, `read`, `get`, `source`, `docs`, `previous`, `next`, `all work`, `github`, `log`, `feed`, `back to 1mb`.

**Accessible names** are lowercase too and get the same review: `counter` (the counter section), `counting` (the button while counting), `{verb} {name}` (each track's verb), `more work` (the sequence), `dark theme` (the toggle; `aria-pressed` carries the state).

The verb is fixed by side: `open` (use), `read` (read), `get` (build with). A content file cannot set it.

**The counter speaks in the same word as its button:** `count me in`, then `you're in`; the line beneath reads `{n} in`, or `no one yet`. While counting, the button shows `...` and is named `counting` for screen readers.

**Status is sentences, never badges:**

| Fact (from content)       | Page says                                        | Index says     |
| ------------------------- | ------------------------------------------------ | -------------- |
| Live                      | nothing                                          | nothing        |
| `retired: true` with site | No longer running. The write-up stays at {host}. | `retired`      |
| `source` set              | Source is public.                                | nothing        |
| `maintained: true`        | Source is public and kept current.               | nothing        |
| `maintained: false`       | Source stays public. No longer maintained.       | `unmaintained` |
| Private source            | nothing, anywhere                                | nothing        |

Upkeep is an editorial claim: it appears only when a content file states it.

## Tokens

Defined in `style.css`; listed here for intent.

| Kind    | Tokens                                                              | Intent                                                                                                                                                   |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ink     | `--fg`, `--muted`                                                   | Two levels of emphasis are enough                                                                                                                        |
| Paper   | `--bg`, `--surface`, `--border`                                     | Surface only for `code`; border only for quiet outlines (theme toggle, counter error)                                                                    |
| Type    | `--font-display` (Space Grotesk 700), `--font-body` (Inter 400–600) | Display for the capstone, mark, manifesto, bridge, titles, sequence names and watermark only. Roman throughout: the faces ship no italic, so none is set |
| Size    | `--text-sm` 14 → `--text-4xl` 56                                    | 14px floor for text; 56 is the capstone and the 404 numeral only                                                                                         |
| Space   | `--space-1` 8 → `--space-8` 64, 8pt grid                            | Sections breathe; rows stay tight                                                                                                                        |
| Measure | 480px column everywhere                                             | ~60 characters; cover, index, notes and colophon share one spine                                                                                         |

No accent colour. Monochrome is the brand.

**Contrast (WCAG AA, 4.5:1 for text):** muted on paper 5.11 light / 5.58 dark; muted over the watermark 4.72 light (at 4%) / 5.06 dark (at 6%). Light cannot go above 4%: at 6% it drops to 4.55, the edge of AA. Dark runs at 6% so the signature reads the same in both themes. Checked by computing relative luminance of the token pairs, with the watermark blended at its opacity.

## Layout

- The cover is capped at `min(80svh, 640px)`. Rule it serves: on a 1280×800 screen the bridge line is visible at the fold; on a tall screen the index is never pushed out of reach.
- Every watermark centres on its own section (`position: relative; isolation: isolate` on the host), so it moves with the content it sits behind.
- Centre the cover; left-align anything scanned (index, notes).
- Short work pages end where the notes end. No minimum height to push the colophon down.
- Type steps on the cover: capstone 56, manifesto 32, body 16. The bridge (24, display) opens the index 64px below the cover, so it reads as the index's title, not a stray line.
- The colophon sits 64px below the last content on every page. Sections end flush; the colophon owns the gap.
- Each side's heading carries an id (`use`, `read`, `build`), so `/#build` is that side's address. When any side passes 12 rows or the index reaches 16 works (measured: at 16, the last side starts two viewports down at 1280×800), `gen` links the bridge's three sentences to their sides, full stops outside the links, and says so in its output; below that they stay plain text. Never paginate, collapse, filter, pin headings or drop taglines. The home page passing 8 viewports at 1280×800 prompts an owner review, never an automatic change.

## States

| State           | Treatment                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------- |
| Hover           | Links go from muted to ink, or gain an underline. `.action` drops to 85% opacity             |
| Focus-visible   | 2px ink outline, 2px offset (4px on the mark and sequence blocks), on every link and control |
| Counter, voted  | Button reads `you're in`, transparent, muted                                                 |
| Counter, error  | Button reads `try again`, outlined                                                           |
| Counter loading | Nothing. The proof line stays hidden until there is a count; on failure it never appears     |
| No JavaScript   | Theme toggle and counter proof absent; everything else intact                                |
| Reduced motion  | Transitions off; the watermark stays still                                                   |
| Touch           | The watermark stays still: no hover, no drift                                                |

## Accessibility

- One `h1` per page (the `1mb` capstone on root, the work's name on its page). The bridge is `h2`, sides are `h3`.
- Each track has two links in this order: name (to the page), then verb (to the product), with `aria-label="{verb} {name}"`. Visible numbers are `aria-hidden`; each side's list carries `start` so numbering continues.
- Focus order matches visual order: mark, content, sequence, `all work`, colophon (`1mb`, theme toggle, `github`, `log`, `feed`).
- Text never below 14px; contrast as above.

## Web presence

What every page carries, and why. `scripts/work.js` renders it for work pages; the root and 404 are hand-written to the same standard.

- **Title:** `{name}: {tagline} · 1mb` (taglines are one sentence; the parser enforces it), so a search result says what the work is; root `1mb, one-man-band: Things to use, read and build with`. 70 characters at most: the parser rejects a tagline that would push a title past it. Middle dot and colon, never an em-dash.
- **Description:** the tagline, then whole synopsis sentences while they fit in 160 characters. Authored copy only, never cut mid-sentence. Root, OG, JSON-LD and the manifest share one sentence.
- **Canonical:** self, absolute, trailing slash; matches `og:url`.
- **Open Graph:** type, url, title, description, the one shared image with width, height and alt, site name, locale. `twitter:card` only; X falls back to OG.
- **Structured data:** one entity graph. Root: `WebSite` (`#website`) published by `Organization` (`#org`, `sameAs` GitHub and the log). Work pages: `WebPage` with `isPartOf #website`, `publisher #org`, a `BreadcrumbList`, and `about` typed by side: `WebApplication` (use), `CreativeWork` (read), `SoftwareSourceCode` (build). `codeRepository` and `sameAs` appear only for public source. No ratings, no dates: nothing invented.
- **Crawling:** our own `robots.txt`, open to every crawler, AI included (`Content-Signal: search=yes, ai-input=yes, ai-train=yes`). It must be the file served: Cloudflare's managed robots.txt stays off. The sitemap lists the root and every published work; `build.js` adds `<lastmod>` at deploy from the git log of each page's content file, so the date is real or absent, never guessed. The 404 is `noindex`; GitHub Pages serves it with a real 404 status.
- **CSP (meta):** `script-src 'self'`, no inline script or style, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`; the root alone may `connect-src` the counter API.
- **Icons:** `1mb` outlined from Space Grotesk 700 into SVG paths, so every client draws the same mark. SVG plus PNG at 16, 32, 180 (touch), 192, 512 and a 512 maskable (mark inside the 80% safe zone), and `/favicon.ico` for clients that ask blindly. Regenerate with `npm run icons`, never by hand.
- **Feeds:** `/feed.xml`, Atom, one entry per listed work, newest listing first (by `listed:`, then `shipped:`); advertised on every page and linked from the colophon. The root also advertises the log's RSS.
- **Security contact:** `/.well-known/security.txt`: `security@1mb.dev` and GitHub private vulnerability reporting on the home repo; `Expires` stamped a year out at each deploy.
- **Same tab, `rel="me"`** on the GitHub link, `humans.txt` as `rel="author"`.

## Vocabulary

| Name         | Class                                                 | Is                                                                               |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Capstone     | `.logo`                                               | `1mb` at 56px, the root `h1`, top of the cover                                   |
| Masthead     | `.masthead`                                           | Top of inner pages: the mark alone                                               |
| Mark         | `.mark`                                               | `1mb` in the display face, small, top centre, links home                         |
| Theme toggle | `.theme-toggle`                                       | The one glyph control (☀/☾), in the colophon                                     |
| Hero         | `.hero`                                               | The cover; capped height                                                         |
| Manifesto    | `.manifesto`                                          | "All the hats. One head." under the capstone                                     |
| Watermark    | `::before` on `.hero`, `.page-work main`, `.page-404` | The numeral behind each content section, at `--watermark`; drifts by `--drift-*` |
| Separator    | `.separator`                                          | `· · ·` in muted ink, the cover's one divider                                    |
| Bridge       | `.work-title`                                         | The line that opens the index                                                    |
| Side         | `.side`                                               | A group heading: tracked, muted                                                  |
| Track        | `.track`                                              | One work row: `-no`, `-name`, `-state`, `-lead`, `-verb`, `-tagline`             |
| Notes        | `.notes`                                              | A work page: `-side`, `-tagline`, `-body`, `-status`, `-next`                    |
| Action       | `.action`                                             | The one filled control on a page (also the counter button)                       |
| Sequence     | `.sequence`, `.all-work`                              | Previous and next work; the `all work` link beneath                              |
| Colophon     | `.colophon` (`-home`, `-credit`, `-meta`)             | Every page's last two lines, a three-column grid: mark, credit and links, toggle |

Labels inside notes (`why it exists`, `what it taught`, `related`) share the side style: one heading voice across the site.

## Constraints: what 1mb does not do

- No cards, shadows, gradients, glass, or hover lift.
- No pills, badges, coloured status, or traffic lights.
- No icons or emoji in content. The theme toggle's ☀/☾ is the one glyph control.
- No screenshots, hero images, or per-work artwork. One shared social image.
- No motion beyond a 0.2s opacity or colour change on hover, and the watermark's drift. No scroll effects. No loading skeletons.
- No hover-only information. No arrows; labels and underlines are the affordance.
- No `target="_blank"`. Links open in the same tab.
- No fixed or floating controls. Everything scrolls with the page.
- No centred lists. Centre the cover, left-align anything scanned.
- No featured slots, counts, stars, dates or activity pulled from GitHub.
- No infinite lists, no "explore", no exclamation marks, no em-dashes.
- No navigation bar. The mark is the only thing at the top of a page.
- No new token for a single use.

## Content format

`content/index.txt` decides what is listed, in which side, in what order. `content/work/{slug}.md` holds one work: flat front matter (`name`, `tagline`, `site`, `source`, `docs`, `retired`, `maintained`, `shipped`, `listed`), then the synopsis, `## Why it exists`, optional `## What it taught` and `## Related`. Inline: links, `*emphasis*`, `` `code` ``. Anything else fails the build with file and line.

To add a work: write `content/work/{slug}.md`, check it reads well as a draft, list the slug in `content/index.txt`, run `npm run gen`, commit `content/` and `docs/` together. CI fails when `docs/` is stale.

A file not listed in `index.txt` is a draft. Works enter the index one at a time, after the owner has read the copy and every status claim it makes. Once listed, a work's page never disappears; retire it instead.

Within a side, the work most useful to a reader with no context comes first; retired and unmaintained works come last. No side launches or stays at a single row: one row reads as a stub.

A listed work needs two dates, both hand-picked during curation. `shipped: YYYY-MM-DD` is its go-live date. `listed: YYYY-MM-DD` is the day it joins the index; it dates the feed, so a work listed today never enters the feed months old. It may not precede `shipped`. Both are editorial, so `gen` stays deterministic. Current values are placeholders: `shipped` is the first commit, `listed` the day the field landed. `shipped` is a sensible date, not a proven one: the first release or tag, the first commit, or the owner's own pick. The commit that lists the work says which.

## Regenerating

Every generated file has one script. Edit the source, run the script, commit both.

| Script          | Source                                                              | Writes                                                                           | When                                                      |
| --------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `npm run gen`   | `content/`, `scripts/work.js` templates                             | Work pages, index block, masthead and colophon blocks, `sitemap.xml`, `feed.xml` | Any content or template change. CI fails if stale         |
| `npm run icons` | `docs/assets/fonts/space-grotesk-700-latin.woff2`, `scripts/icons/` | Outlined SVGs, PNGs, `favicon.ico`                                               | Mark, colours or sizes change. Reproducible byte for byte |
| `npm run build` | git history, the clock                                              | SW cache version, colophon year, sitemap `<lastmod>`, security.txt `Expires`     | CI only, at deploy. Never commit its output               |

`npm run icons` needs `python3`; its Python packages are pinned in `scripts/icons/requirements.txt` and install into `node_modules/.cache`.

## Considered, not taken

| Direction                                                                                                      | Why not                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Card grid with screenshots                                                                                     | Stock. Images go stale, cards compete with the manifesto                                                                                                                                                     |
| Ledger: columns for name, kind, status, links                                                                  | Reads as a dashboard; columns collapse badly on phones; status-forward                                                                                                                                       |
| Grouping by hat (maker, writer, engineer)                                                                      | Author-centred; the reader's action is the useful axis                                                                                                                                                       |
| Track number on work pages                                                                                     | Shifts when the index is reordered; means nothing to a link reader                                                                                                                                           |
| Theme toggle only on the root                                                                                  | Breaks predictability; the colophon is the same everywhere                                                                                                                                                   |
| Nav bar: mark left, `work` and toggle right                                                                    | Read as a stock app header; competed with the cover (round 2, removed)                                                                                                                                       |
| Prev/next as one line of arrowed names                                                                         | Cramped; gave a reader nothing to choose by (round 2, removed)                                                                                                                                               |
| No logo on the cover, watermark only                                                                           | The cover lost its anchor (round 2, reversed by owner)                                                                                                                                                       |
| Sequence that wraps from last to first                                                                         | A record has an end; wrapping hides how much there is                                                                                                                                                        |
| Constellation or orbit map of works                                                                            | Decoration over information; out of scope                                                                                                                                                                    |
| 1mb as a one-megabyte platform                                                                                 | A different brand: the name is one-man-band, not a size                                                                                                                                                      |
| Pagination, collapsed sides, sticky side headings                                                              | Hide how much there is; sticky headings float                                                                                                                                                                |
| Side pages (`/use/`, `/read/`, `/build-with/`), or a home capped at the first few rows with a link to the rest | A cap is a featured slot and stops `all work` meaning all. Side pages are permanent URLs that duplicate the index. A side's address is `/#build`. Reopened only by an owner decision, which cannot be undone |

## Decision log

| Date       | Decision                                                                               | Rationale                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 2026-10-29 | The record as the organising metaphor                                                  | One-man-band is a musical idea; a track listing is a native, quiet index                                  |
| 2026-10-29 | Sides = use / read / build with                                                        | Named for the reader's first action, not the technology                                                   |
| 2026-10-29 | Dotted leaders between title and verb                                                  | The sleeve's device; ties name to action without arrows or columns                                        |
| 2026-10-29 | Status as sentences; upkeep only when stated                                           | Editorial, never derived; silence for live work and private source                                        |
| 2026-10-29 | Manifesto becomes the headline; invitation in full ink                                 | The page had no headline and spoke to the reader in an aside                                              |
| 2026-10-29 | Bridge line "Use it. Read it. Build with it."                                          | Nothing on the cover said the work follows                                                                |
| 2026-10-29 | Shared masthead and colophon generated for every page                                  | Predictable navigation; one template cannot drift                                                         |
| 2026-10-29 | Counter skeleton and ✓ glyph removed                                                   | A loading state was the cover's last impression; the label carries state                                  |
| 2026-10-29 | "one-man-band" kept out of visible copy                                                | Owner direction: the name lives in titles and metadata                                                    |
| 2026-10-29 | Capstone `1mb` restored above the manifesto (56px)                                     | Owner: the cover needs an anchor                                                                          |
| 2026-10-29 | Nav bar removed; mark alone, top centre, on inner pages                                | Owner: mark + `work` read as ugly; the mark is the one constant                                           |
| 2026-10-29 | Theme toggle moved to the colophon                                                     | Out of the reading path, same place on every page                                                         |
| 2026-10-29 | Sequence as labelled blocks with taglines                                              | Owner: arrowed names were cramped; a tagline gives a reason to go                                         |
| 2026-10-29 | Em-dashes banned, enforced by the build                                                | Owner rule; an AI tell in this register                                                                   |
| 2026-10-29 | Copy gets an author pass, then a reviewer's pass                                       | Owner rule; every string, not only long copy                                                              |
| 2026-10-29 | Manifesto 32px under the 56px capstone                                                 | At 24 it read as a caption under a logo                                                                   |
| 2026-10-29 | `--watermark` token: 4% light, 6% dark                                                 | Same visual weight in both themes; both keep muted text above AA                                          |
| 2026-10-29 | Separator in muted ink                                                                 | At border colour it was 1.2:1 and read as dust                                                            |
| 2026-10-29 | Year stamped at deploy by `build.js`                                                   | `gen` stays deterministic; the page never shows a stale year after a deploy                               |
| 2026-10-29 | Links open in the same tab                                                             | Reader control; Back works; no warning needed                                                             |
| 2026-10-29 | No italic; credit in roman                                                             | Inter ships no italic, so the browser faked one; a third type treatment nobody named                      |
| 2026-10-29 | One 64px gap above the colophon, owned by the colophon                                 | Index and work pages ended at different distances                                                         |
| 2026-10-29 | Count line all muted                                                                   | The button is the cover's focal point after the manifesto; the count is periphery                         |
| 2026-10-29 | Web presence baseline (see section)                                                    | Owner: what we overlook matters more than what we remember                                                |
| 2026-10-29 | Descriptive titles, 70-char cap                                                        | Owner: fewer words do not help discovery                                                                  |
| 2026-10-29 | Own robots.txt, open to AI crawlers                                                    | Owner: more allowing; the policy lives in git                                                             |
| 2026-10-29 | Icons outlined from Space Grotesk, regenerated by script                               | The old SVG used the system font and the 512 was an upscale                                               |
| 2026-10-29 | Colophon in two lines: credit and toggle, then © and links                             | Owner: credit and switch first, links second                                                              |
| 2026-10-29 | Colophon grid: links aligned under the credit, © year last                             | Owner sketch; the year is a sign-off, so it reads last rather than sitting alone under the toggle         |
| 2026-10-29 | Watermark removed from the index                                                       | Owner: one `1` on the home page; two read as repetition                                                   |
| 2026-10-29 | `.sequence-all` renamed `.all-work`; also on the 404                                   | The 404 needed a second way out; one name for one link                                                    |
| 2026-10-29 | Invitation "Work this way too?"; counter "{n} in"; 404 "The rest is still here."       | Copy review: "resonates" was a tell, "joined by" claimed a join that had not happened                     |
| 2026-10-30 | Watermark drift restored, 8px at most (was 15)                                         | Owner: the movement was part of the signature; kept subtler than the original parallax                    |
| 2026-10-30 | Sign-off at v0.6.0: scaling and order rules, accessible names, superseded rows removed | Four lenses reviewed in parallel; the design reopens only for a new owner reason                          |
| 2026-10-30 | Counter line drops `{t} today`                                                         | Owner agreed: a second number in the periphery asks for attention, against quiet by default               |
| 2026-10-30 | No side pages; side ids now; `gen` links the bridge past the trigger                   | A cap is a featured slot, side pages duplicate the index forever; `/#build` gives a side an address today |
| 2026-10-30 | `listed:` dates the Atom feed; `shipped:` stays the go-live date                       | A work listed today never enters the feed months old                                                      |
| 2026-10-30 | Time words rejected in copy                                                            | A page is never re-dated; status comes from front matter                                                  |
| 2026-10-30 | No evidence script; `shipped:` is a sensible date                                      | Owner: no cost to getting it wrong, so a log date or a hand pick is enough                                |
| 2026-10-30 | Work-copy checklist lives in Voice                                                     | The reviewer reads Voice; the list had lived outside the repo                                             |
| 2026-10-30 | "Ends with weight" means a checkable fact                                              | Owner: the checklist said fact, the register said weight; samples ended on maxims                         |

## Evolving this

Change the reason here before changing the value in CSS. New component: name it in Vocabulary first. New constraint: say what it prevents. Version: patch for clarifications, minor for new parts, major when a part is renamed or removed.
