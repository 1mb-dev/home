# 1mb design language

1mb is a one-man-band: things to use, read and build with, each shipped end to end. 1mb.dev is a manifesto with that work beneath it, built like a record. The hero is the cover, the index is the track listing, each work page is the liner notes, and every page ends on the credit.

The feeling is a sleeve on a shelf: quiet, typographic, owned. Nothing on it asks for attention it has not earned.

This file says how it is made, and what it refuses. Values live in `docs/assets/css/style.css`. Rules change here first, and a new constraint says what it prevents. To add a work, see [content/README.md](content/README.md).

## The reader

A stranger arrives from a link, often on a phone, often skimming. They want what 1mb is, then the thing, in one click.

Every work page stands alone for that reader. A row's name goes to the 1mb page, and on touch the whole row does; its verb goes straight to the product. A work's address never changes with its status.

## The record

| Part        | Device                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| Cover       | The `1mb` capstone, the manifesto "All the hats. One head.", a counter  |
| Bridge      | "Use it. Read it. Build with it." opens the index and names the sides   |
| Sides       | Groups named by the reader's action: use, read, build with              |
| Tracks      | Number, title, dotted leader, verb, tagline beneath. Same on every side |
| Liner notes | A work's own page: side, title, tagline, notes, status, next            |
| Sequence    | Previous and next work, each with its tagline. No wrap: a record ends   |
| Credit      | The manifesto again on every page, the back of the sleeve               |

**The watermark `1` is the signature.** It sits behind the cover and behind the notes on each work page. One per page: the index has none, so the cover's `1` stays the home page's only one. The 404 carries a `0`. On a fine pointer it drifts up to 8px against the cursor and eases home. Reduced motion and touch keep it still. Refine it; never remove or demote it.

**The capstone anchors the cover.** `1mb` tops the root. Inner pages carry the same mark, small, top centre: the one constant at the top of every page. There it stays while the page scrolls beneath it, so a reader who arrived by a link keeps the way home. The root is home, so its capstone leaves with the cover.

Numbering is for the index only. It follows the index order and changes when that order changes, so it never appears on a work page or in a URL.

## Principles (in order)

1. **The manifesto leads.** The work is the proof beneath it, never the headline above it.
2. **Typography is the interface.** Two faces and the system's mono for code, one ink, one paper. No icons, images, colour accents or illustrations carry meaning.
3. **Quiet by default.** Live work shows no status. Private source shows nothing. One filled control per page.
4. **Predictable.** Every page ends the same way, and the top is always the mark. Things are where they were on the last page.
5. **Readable without script.** HTML first; JavaScript adds the counter, theme, offline and the watermark's drift. Cloudflare injects its analytics beacon; nothing else runs.
6. **Every element earns its place.** If deleting it loses the reader nothing, it goes.

## Voice

A listing is the work's showcase: why it was built, what it set out to show. Not a pitch, not an audit. Why it exists and What it taught carry the page, with the work or the problem as their subject.

Short sentences. No I or we. Copy describes the work and the problem, never the maker. The last line lands on a fact a stranger can check, not a maxim. The name "one-man-band" lives in page titles and metadata; the visible page does not repeat it.

**No em-dashes.** Not in copy, titles, metadata or interface strings. Use a full stop, a comma, a colon or a middle dot (`sift · 1mb`). The build (`npm run gen`) rejects them.

**No time words.** `currently`, `now`, `recently`, `today`, `latest` and `these days` go stale on a page nobody re-dates. The build rejects them outside code spans and link targets.

Copy is checked against this section before it ships: new copy, edited copy and interface strings alike.

| Field          | Says                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Tagline        | What the work is, not what it is like: one line, no full stop. Aim for 36 characters            |
| Description    | The search result: the category a searcher types, and the limit. 70 to 160                      |
| Tags           | Three to six lowercase words a searcher would use. Never padding                                |
| Synopsis       | What it does, with a number or a name. Then a limit only where the page would otherwise mislead |
| Why it exists  | What the work was built to do, and the problem it answers                                       |
| What it taught | What the work set out to show, or a point from its record the owner approves                    |

The first thing a stranger would check goes on the page when its absence would mislead, not in the linked docs: what a queue does in a crash, what a service keeps and for how long.

A behaviour is stated only as far as it was run: "after a hard kill", not "after a crash", if power loss was never tested.

A limit is what a reader needs to decide. A work's known faults do not get a list: one line where the page would otherwise mislead, and no more.

A page carries at most one contrast line ("not X, but Y") and borrows no run of fragments from another listed work.

Every claim is checked at its source. A claim that could not be verified is stated only if the maker confirms it.

**Status is sentences, never badges.** It lives in front matter, and the body never restates it.

| Fact (from content)       | Page says                                        | Index says     |
| ------------------------- | ------------------------------------------------ | -------------- |
| Live                      | nothing                                          | nothing        |
| `retired: true` with site | No longer running. The write-up stays at {host}. | `retired`      |
| `source` set              | Source is public.                                | nothing        |
| `maintained: true`        | Source is public and kept current.               | nothing        |
| `maintained: false`       | Source stays public. No longer maintained.       | `unmaintained` |
| Private source            | nothing, anywhere                                | nothing        |

Upkeep is an editorial claim: it appears only when a content file states it.

**Interface strings are lowercase.** The verb is fixed by side: `open`, `read`, `get`. A content file cannot set it. The counter speaks in the same word as its button: `count me in` beside `{n} in`, then `you're in with {n-1} others`, or `you're in` alone.

## What 1mb does not do

- No cards, shadows, gradients, glass, or hover lift.
- No pills, badges, coloured status, or traffic lights.
- No icons or emoji in content. The theme toggle's ☀/☾ is the one glyph control.
- No screenshots, hero images, or per-work artwork. One shared social image.
- No motion beyond a 0.2s opacity or colour change on hover, and the watermark's drift. No scroll effects, beyond the line that appears under the mark on inner pages once it sticks. No loading skeletons.
- No hover-only information. No arrows; labels and underlines are the affordance.
- No `target="_blank"`. A forced new tab breaks Back.
- No fixed or floating controls, except the mark on inner pages: it stays at the top, and nothing sits beside it. On a short screen it scrolls with the page too.
- No centred lists. Centre the cover, left-align anything scanned.
- No featured slots, counts, stars, dates or activity pulled from GitHub.
- No infinite lists, no "explore", no exclamation marks.
- No navigation bar. The mark is the only thing at the top of a page.

## Type and ink

Two faces, and the system's mono for code. Space Grotesk 700 for the capstone, mark, manifesto, bridge, titles, sequence names and watermark; Inter for everything else. Roman throughout: the faces ship no italic, so none is set.

Two levels of ink on one paper. No accent colour. Monochrome is the brand. Labels are 14px and tracked: sides and sequence labels in muted, note headings in ink.

One column, about 60 characters, shared by the cover, the index, the notes and the credit. Text wraps rather than clips, code included: a split term is still all there. Text never drops below 14px. A standalone link's target runs past its word and stops at the line beside it, and further at a page's end.

The watermark sits at 4% ink in light and 6% in dark, so it reads the same in both. Light cannot go higher: at 6%, muted text falls to the edge of WCAG AA.

## Layout

The cover stops short of the fold. On a 1280×800 screen the bridge line stays visible; on a tall screen the index stays in reach.

Short work pages end where the notes end. Nothing pushes the credit down.

The index grows in place. Never paginate, collapse, filter, pin headings or drop taglines. Each side has an address (`/#build`). The bridge stays plain text. A home page past 8 viewports at 1280×800 is a decision, never an automatic change. At large text a track gives way with no query: name and verb stay whole, and the verb drops below the name.

The manifesto holds one line down to a 320px screen. Its size gives way before its line does.

One `h1` per page. Focus order matches visual order, and every link and control takes one focus ring: 2px of ink at a 2px offset. Without JavaScript the theme toggle goes missing, the counter's proof shows no count, and the count button does nothing. The button's row keeps its height in every state, so neither the count nor a vote moves the cover.

## Considered, not taken

Three directions turned down, and why.

| Direction                                 | Why not                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| Card grid with screenshots                | Stock. Images go stale, cards compete with the manifesto |
| Grouping by hat (maker, writer, engineer) | Author-centred; the reader's action is the useful axis   |
| 1mb as a one-megabyte platform            | A different brand: the name is one-man-band, not a size  |
