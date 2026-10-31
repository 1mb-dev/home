/**
 * Work index: parse content/, validate, render HTML.
 *
 * Pure functions only; scripts/gen.js does the file IO.
 * The content format is a deliberate subset (see content/README.md):
 * anything outside it is an error, never silently dropped.
 */

export const SITE = 'https://1mb.dev';

// Group = the work's first action. Order here is display order on the root.
export const GROUPS = {
  use: { label: 'use', verb: 'open' },
  read: { label: 'read', verb: 'read' },
  build: { label: 'build with', verb: 'get' },
};

const KEYS = new Set([
  'name',
  'tagline',
  'description',
  'tags',
  'site',
  'source',
  'docs',
  'language',
  'retired',
  'maintained',
  'shipped',
  'listed',
]);
const URL_KEYS = new Set(['site', 'source', 'docs']);
const BOOL_KEYS = new Set(['retired', 'maintained']);
const DATE_KEYS = new Set(['shipped', 'listed']);

// Body sections, in the only order they may appear. Synopsis is the text before the first heading.
const SECTIONS = [
  { heading: 'Why it exists', key: 'why', label: 'why it exists', required: true },
  { heading: 'What it taught', key: 'taught', label: 'what it taught', required: false },
  { heading: 'Related', key: 'related', label: 'related', required: false },
];

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const TAGLINE_MAX = 80;
const TITLE_MAX = 70; // search results truncate beyond this; html-validate enforces it too
const DESCRIPTION_MIN = 70; // shorter and search engines write their own snippet
const DESCRIPTION_MAX = 160; // search results truncate beyond this
const TAGS_MIN = 3;
const TAGS_MAX = 6;
const TAG = /^[a-z0-9][a-z0-9 +#.-]*$/;
const PARAGRAPH_MAX = 400;

export class ContentError extends Error {
  constructor(file, line, message) {
    super(`${file}:${line} ${message}`);
    this.name = 'ContentError';
  }
}

// Em-dashes are banned from copy (design.md, Voice). Matches the character and its escapes.
const EM_DASH = /\u2014|&mdash;|\\u2014|\\u\{0*2014\}|&#0*8212\b|&#x0*2014\b|\\0*2014\b/i;

export function assertNoEmDash(text, file) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => EM_DASH.test(l));
  if (i !== -1) throw new ContentError(file, i + 1, 'em-dash in copy; rewrite the sentence');
}

// Time words go stale on a page that is never re-dated (design.md, Voice). Code spans and link
// targets are exempt: `/releases/latest` is an address, not a claim.
const RELATIVE_TIME = /\b(currently|now|recently|today|latest|these days)\b/i;

function assertNoRelativeTime(text, file, line) {
  const hit = RELATIVE_TIME.exec(text.replace(/`[^`]*`|\]\([^)]*\)/g, ''));
  if (hit) {
    throw new ContentError(file, line, `"${hit[1]}" goes stale; state what is true without it`);
  }
}

// What the site serves as text, so the em-dash scan reaches it. Anything else under docs/ must be
// binary (work.test.js checks), or a new text type would pass the scan unread.
const TEXT = /\.(html|css|js|json|xml|txt|svg|webmanifest)$|^_headers$/;

export function isText(name) {
  return TEXT.test(name);
}

export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * content/index.txt -> [{ slug, group, line }]
 */
export function parseIndex(text, file = 'content/index.txt') {
  const entries = [];
  const seen = new Set();
  let group = null;

  text.split('\n').forEach((raw, i) => {
    const line = i + 1;
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) return;

    if (!raw.startsWith(' ')) {
      const name = raw.trim();
      if (!GROUPS[name]) {
        throw new ContentError(file, line, `unknown group "${name}" (use | read | build)`);
      }
      group = name;
      return;
    }

    const slug = raw.trim();
    if (!group) throw new ContentError(file, line, `"${slug}" is listed before any group`);
    if (!SLUG.test(slug)) throw new ContentError(file, line, `invalid slug "${slug}"`);
    if (seen.has(slug)) throw new ContentError(file, line, `"${slug}" is listed twice`);
    seen.add(slug);
    entries.push({ slug, group, line });
  });

  // Track numbers run across groups in display order, whatever order the file lists them in.
  const order = Object.keys(GROUPS);
  return entries
    .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
    .map((entry, i) => ({ ...entry, no: i + 1 }));
}

function parseTags(value, file, line) {
  const tags = value.split(',').map((t) => t.trim());
  if (tags.length < TAGS_MIN || tags.length > TAGS_MAX) {
    throw new ContentError(file, line, `${tags.length} tags (${TAGS_MIN} to ${TAGS_MAX})`);
  }
  if (new Set(tags).size !== tags.length) throw new ContentError(file, line, 'duplicate tag');
  for (const tag of tags) {
    if (!TAG.test(tag)) throw new ContentError(file, line, `tag "${tag}" must be lowercase`);
  }
  return tags;
}

/**
 * content/work/{slug}.md -> { slug, name, tagline, site?, source?, docs?, language?, retired, maintained,
 *                             shipped?, listed?, description?, tags?,
 *                             synopsis: [para], why: [para], taught: [para], related: [link] }
 * Paragraphs are kept as { text, line } so inline errors can point at the source line.
 */
export function parseWork(text, slug, file = `content/work/${slug}.md`) {
  if (!SLUG.test(slug)) throw new ContentError(file, 1, `invalid slug "${slug}"`);
  assertNoEmDash(text, file);

  const lines = text.split('\n');
  if (lines[0] !== '---') throw new ContentError(file, 1, 'expected front matter opening "---"');

  // maintained stays undefined unless the file says so: upkeep is an editorial claim, never a default.
  const work = { slug, retired: false, synopsis: [], why: [], taught: [] };
  work.related = [];

  const seen = new Set();
  let listedLine;
  let i = 1;
  for (; i < lines.length && lines[i] !== '---'; i++) {
    const line = i + 1;
    const match = /^([a-z]+): (.+)$/.exec(lines[i]);
    if (!match) throw new ContentError(file, line, 'expected "key: value"');
    const key = match[1];
    const value = match[2].trim();
    if (!KEYS.has(key)) throw new ContentError(file, line, `unknown key "${key}"`);
    if (seen.has(key)) throw new ContentError(file, line, `duplicate key "${key}"`);
    seen.add(key);
    if (URL_KEYS.has(key) && !/^https:\/\/[^\s]+$/.test(value)) {
      throw new ContentError(file, line, `${key} must be an https:// URL`);
    }
    if (DATE_KEYS.has(key) && !isDate(value)) {
      throw new ContentError(file, line, `${key} must be a date, YYYY-MM-DD`);
    }
    if (key === 'listed') listedLine = line;
    if (key === 'tagline' || key === 'description') assertNoRelativeTime(value, file, line);
    if (
      key === 'description' &&
      (value.length < DESCRIPTION_MIN || value.length > DESCRIPTION_MAX)
    ) {
      throw new ContentError(
        file,
        line,
        `description is ${value.length} chars (${DESCRIPTION_MIN} to ${DESCRIPTION_MAX})`
      );
    }
    if (key === 'tags') {
      work.tags = parseTags(value, file, line);
      continue;
    }
    if (BOOL_KEYS.has(key)) {
      if (value !== 'true' && value !== 'false') {
        throw new ContentError(file, line, `${key} must be true or false`);
      }
      work[key] = value === 'true';
    } else {
      work[key] = value;
    }
  }
  if (i >= lines.length) throw new ContentError(file, 1, 'front matter is not closed with "---"');

  if (work.listed && work.shipped && work.listed < work.shipped) {
    throw new ContentError(file, listedLine, 'listed must not precede shipped');
  }
  if (!work.name) throw new ContentError(file, 1, 'missing "name"');
  if (!work.tagline) throw new ContentError(file, 1, 'missing "tagline"');
  if (/[.!?](\s|$)/.test(work.tagline)) {
    throw new ContentError(file, 1, 'tagline is one line with no full stop (it is the page title)');
  }
  if (work.tagline.length > TAGLINE_MAX) {
    throw new ContentError(file, 1, `tagline is ${work.tagline.length} chars (max ${TAGLINE_MAX})`);
  }
  const title = `${workHeadline(work)} · 1mb`;
  if (title.length > TITLE_MAX) {
    throw new ContentError(
      file,
      1,
      `page title "${title}" is ${title.length} chars (max ${TITLE_MAX}); shorten the tagline`
    );
  }

  // Body: paragraphs separated by blank lines, under fixed headings.
  let section = 'synopsis';
  let sectionIndex = -1;
  let para = null;
  const flush = () => {
    if (para) work[section].push(para);
    para = null;
  };

  for (i += 1; i < lines.length; i++) {
    const line = i + 1;
    const raw = lines[i];

    if (raw.trim() === '') {
      flush();
      continue;
    }

    if (raw.startsWith('#')) {
      flush();
      const heading = /^## (.+)$/.exec(raw);
      const next = heading && SECTIONS.findIndex((s) => s.heading === heading[1]);
      if (next === null || next === -1) {
        throw new ContentError(file, line, `unsupported heading "${raw}"`);
      }
      if (next <= sectionIndex) {
        throw new ContentError(file, line, `"${heading[1]}" is out of order or repeated`);
      }
      sectionIndex = next;
      section = SECTIONS[next].key;
      continue;
    }

    if (/^\s*([-*+]\s|>|\||\d+\.\s|!\[)/.test(raw)) {
      throw new ContentError(file, line, 'unsupported markup (lists, quotes, tables, images)');
    }
    assertNoRelativeTime(raw, file, line);

    if (section === 'related') {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(raw.trim());
      if (!link) throw new ContentError(file, line, 'each Related line must be one [text](url)');
      checkHref(link[2], file, line);
      plain(link[1], file, line);
      work.related.push({ text: link[1], href: link[2], line });
      continue;
    }

    if (para) {
      para.text += ` ${raw.trim()}`;
    } else {
      para = { text: raw.trim(), line };
    }
  }
  flush();

  if (work.synopsis.length === 0) throw new ContentError(file, 1, 'missing synopsis');
  for (const s of SECTIONS) {
    if (s.required && work[s.key].length === 0) {
      throw new ContentError(file, 1, `missing "## ${s.heading}"`);
    }
  }
  for (const key of ['synopsis', 'why', 'taught']) {
    for (const p of work[key]) {
      if (p.text.length > PARAGRAPH_MAX) {
        throw new ContentError(
          file,
          p.line,
          `paragraph is ${p.text.length} chars (max ${PARAGRAPH_MAX})`
        );
      }
      renderInline(p.text, file, p.line); // surface inline errors at parse time
    }
  }

  return work;
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function checkHref(href, file, line) {
  if (href.startsWith(`${SITE}/work/`)) {
    throw new ContentError(file, line, `link a work as /work/{slug}/, so it is checked: "${href}"`);
  }
  if (/^https:\/\/[^\s()]+$/.test(href)) return;
  if (/^\/work\/[a-z0-9-]+\/$/.test(href)) return;
  throw new ContentError(
    file,
    line,
    `link must be https:// or /work/{slug}/, with parentheses encoded as %28 %29: "${href}"`
  );
}

/**
 * Inline subset: [text](url), `code`. Everything else is text, escaped.
 */
export function renderInline(text, file = '?', line = 0) {
  const token = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = token.exec(text)) !== null) {
    out += plain(text.slice(last, m.index), file, line);
    if (m[1] !== undefined) {
      out += `<code>${esc(m[1])}</code>`;
    } else {
      checkHref(m[3], file, line);
      out += `<a href="${esc(m[3])}">${plain(m[2], file, line)}</a>`;
    }
    last = token.lastIndex;
  }
  return out + plain(text.slice(last), file, line);
}

// `_` too: Prettier rewrites *x* to _x_, which would otherwise print literally.
function plain(text, file, line) {
  if (/[`*_[\]<>]/.test(text)) {
    throw new ContentError(file, line, `unsupported markup in "${text.trim()}"`);
  }
  return esc(text);
}

/**
 * Cross-file rules: every listed slug has a file, the group's first action has a target,
 * Related /work/ links point at listed works.
 */
export function validateCollection(entries, works) {
  const listed = new Set(entries.map((e) => e.slug));
  for (const entry of entries) {
    const work = works.get(entry.slug);
    const file = `content/work/${entry.slug}.md`;
    if (!work) {
      throw new ContentError('content/index.txt', entry.line, `no file ${file}`);
    }
    if (!work.shipped) {
      throw new ContentError(file, 1, 'listed works need "shipped: YYYY-MM-DD"');
    }
    if (!work.listed) {
      throw new ContentError(file, 1, 'listed works need "listed: YYYY-MM-DD"');
    }
    if (!work.description) {
      throw new ContentError(file, 1, 'listed works need "description: ..." (the search snippet)');
    }
    if (!work.tags) {
      throw new ContentError(file, 1, 'listed works need "tags: a, b, c"');
    }
    if (!primaryAction(work, entry.group)) {
      const needs = entry.group === 'build' ? 'source or docs' : 'site';
      throw new ContentError(file, 1, `group "${entry.group}" needs ${needs}`);
    }
  }
  for (const work of works.values()) {
    const check = (slug, line) => {
      if (slug && !listed.has(slug)) {
        throw new ContentError(`content/work/${work.slug}.md`, line, `"${slug}" is not listed`);
      }
    };
    for (const link of work.related) {
      check(/^\/work\/([a-z0-9-]+)\/$/.exec(link.href)?.[1], link.line);
    }
    for (const p of [...work.synopsis, ...work.why, ...work.taught]) {
      const prose = p.text.replace(/`[^`]*`/g, '');
      for (const [, slug] of prose.matchAll(/\]\(\/work\/([a-z0-9-]+)\/\)/g)) check(slug, p.line);
    }
  }
}

/**
 * Published /work/ URLs never disappear. `previous` = locs from the committed sitemap.
 */
export function checkDurable(previousLocs, entries) {
  const next = new Set(entries.map((e) => workUrl(e.slug)));
  const lost = previousLocs.filter((loc) => loc.includes('/work/') && !next.has(loc));
  if (lost.length > 0) {
    throw new ContentError(
      'content/index.txt',
      1,
      `published pages would disappear: ${lost.join(', ')}. Keep them listed (mark retired) instead.`
    );
  }
}

// "ledgerq: A durable queue that lives on one disk". Search titles carry what the work is.
export function workHeadline(work) {
  return `${work.name}: ${work.tagline}`;
}

export function workPath(slug) {
  return `/work/${slug}/`;
}

export function workUrl(slug) {
  return `${SITE}${workPath(slug)}`;
}

function primaryAction(work, group) {
  const verb = GROUPS[group].verb;
  const href = group === 'build' ? work.source || work.docs : work.site;
  if (!href) return null;
  return { href, verb, label: `${verb} ${work.name}` };
}

function host(url) {
  return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * Status as sentences. Live says nothing; private source says nothing.
 */
export function statusLines(work) {
  const lines = [];
  if (work.retired) {
    lines.push(
      work.site
        ? `No longer running. The write-up stays at ${esc(host(work.site))}.`
        : 'No longer running.'
    );
  }
  if (work.source) {
    if (work.maintained === true) lines.push('Source is public and kept current.');
    else if (work.maintained === false) lines.push('Source stays public. No longer maintained.');
    else lines.push('Source is public.');
  }
  return lines;
}

/**
 * Next actions: the group's first action, then the remaining links once each.
 */
export function actions(work, group) {
  const primary = primaryAction(work, group);
  const rest = [];
  const add = (href, label) => {
    if (href && href !== primary.href) rest.push({ href, label });
  };
  add(work.site, work.retired ? 'write-up' : 'site');
  add(work.source, 'source');
  add(work.docs, 'docs');
  return { primary, rest };
}

function rowState(work) {
  if (work.retired) return 'retired';
  if (work.source && work.maintained === false) return 'unmaintained';
  return null;
}

function trackNo(n) {
  return String(n).padStart(2, '0');
}

/**
 * Shared chrome. The mark sits top centre on every page: the capstone on the root (hand-written),
 * this smaller masthead elsewhere. The colophon closes every page and holds the theme toggle, which
 * ships hidden so it is absent, not dead, without JS. gen.js writes both into the hand-written pages.
 */
export function renderMasthead() {
  return `<header class="masthead"><a class="mark" href="/">1mb</a></header>`;
}

export const LINKS = {
  github: 'https://github.com/1mb-dev',
  log: 'https://log.1mb.dev',
};

// Two lines on a three-column grid: `1mb ·` | the credit, then the links and year beneath it |
// the theme toggle. The links align with the credit, not the mark. The year is stamped at deploy
// by scripts/build.js; the committed value only has to be a year.
export function renderColophon() {
  return `<footer class="colophon">
<p class="colophon-home"><a href="/">1mb</a> ·</p>
<p class="colophon-credit">All the hats. One head.</p>
<button type="button" id="theme-toggle" class="theme-toggle" aria-label="dark theme" aria-pressed="false" hidden>
<span class="icon-sun" aria-hidden="true">☀</span>
<span class="icon-moon" aria-hidden="true">☾</span>
</button>
<p class="colophon-meta">
<a href="mailto:hi@1mb.dev">hi@1mb.dev</a> ·
<a href="${LINKS.github}" rel="me">github</a> ·
<a href="${LINKS.log}">log</a> ·
<a href="/feed.xml">feed</a>
</p>
</footer>`;
}

/**
 * Structured data for a work page: the work typed by its side, inside a page with a breadcrumb.
 * Only public facts: codeRepository appears only when the content names public source.
 */
export function workJsonLd(work, group) {
  const url = workUrl(work.slug);
  const org = { '@type': 'Organization', '@id': `${SITE}/#org`, name: '1mb' };
  const thing = {
    use: { '@type': 'WebApplication', url: work.site },
    read: { '@type': 'CreativeWork', url: work.site },
    build: {
      '@type': 'SoftwareSourceCode',
      codeRepository: work.source,
      programmingLanguage: work.language,
    },
  }[group];
  const about = {
    ...thing,
    name: work.name,
    description: work.description,
    keywords: work.tags.join(', '),
    creator: org,
  };
  if (work.shipped) about.datePublished = work.shipped;
  if (group === 'build' && work.docs) about.sameAs = work.docs;
  if (group !== 'build' && work.source) about.sameAs = work.source;
  for (const key of Object.keys(about)) if (about[key] === undefined) delete about[key];

  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url,
    name: `${workHeadline(work)} · 1mb`,
    description: work.description,
    isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, name: '1mb', url: `${SITE}/` },
    publisher: org,
    about,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '1mb', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: work.name, item: url },
      ],
    },
  };
  // "</" inside a script block would end it early.
  return JSON.stringify(data, null, 2).replace(/<\//g, '<\\/');
}

// Each side's id is its address (/#build). Past the trigger the bridge links to them
// (design.md, Layout); gen says when that switches on.
const BRIDGE = { use: 'Use it', read: 'Read it', build: 'Build with it' };

export function bridgeLinked(entries) {
  const longSide = Object.keys(GROUPS).some(
    (group) => entries.filter((e) => e.group === group).length > 12
  );
  return longSide || entries.length >= 16;
}

function bridge(entries) {
  const linked = bridgeLinked(entries);
  return Object.entries(BRIDGE)
    .map(([group, text]) =>
      linked && entries.some((e) => e.group === group)
        ? `<a href="#${group}">${text}</a>.`
        : `${text}.`
    )
    .join(' ');
}

/**
 * The root index: sides (groups) of numbered tracks. Numbering runs across sides.
 */
export function renderIndex(entries, works) {
  const sides = Object.keys(GROUPS)
    .map((group) => {
      const side = entries.filter((e) => e.group === group);
      if (side.length === 0) return '';
      const rows = side.map((e) => {
        const work = works.get(e.slug);
        const state = rowState(work);
        const verb = primaryAction(work, group);
        return `<li class="track">
<span class="track-no" aria-hidden="true">${trackNo(e.no)}</span>
<span class="track-name"><a href="${workPath(work.slug)}">${esc(work.name)}</a>${
          state ? ` <span class="track-state">${state}</span>` : ''
        }</span>
<span class="track-lead" aria-hidden="true"></span>
<a class="track-verb" href="${esc(verb.href)}" aria-label="${esc(verb.label)}">${verb.verb}</a>
<span class="track-tagline">${esc(work.tagline)}</span>
</li>`;
      });
      return `<h3 class="side" id="${group}">${GROUPS[group].label}</h3>
<ol class="tracks" start="${side[0].no}">
${rows.join('\n')}
</ol>`;
    })
    .filter(Boolean);

  return `<section id="work" class="work" aria-labelledby="work-title">
<h2 id="work-title" class="work-title">${bridge(entries)}</h2>
${sides.join('\n')}
</section>`;
}

/**
 * A work page: liner notes for one track. prev/next are neighbouring entries in index order
 * (null at either end: the record has an end, it does not wrap).
 */
export function renderPage(work, entry, { prev = null, next = null, works } = {}) {
  const group = entry.group;
  const url = workUrl(work.slug);
  const title = `${workHeadline(work)} · 1mb`;
  const { primary, rest } = actions(work, group);
  const paras = (list) =>
    list
      .map((p) => `<p>${renderInline(p.text, `content/work/${work.slug}.md`, p.line)}</p>`)
      .join('\n');
  const section = (key) => {
    const s = SECTIONS.find((x) => x.key === key);
    if (key === 'related') {
      if (work.related.length === 0) return '';
      const items = work.related
        .map((l) => `<li><a href="${esc(l.href)}">${esc(l.text)}</a></li>`)
        .join('\n');
      return `<h2>${s.label}</h2>\n<ul class="related">\n${items}\n</ul>`;
    }
    if (work[key].length === 0) return '';
    return `<h2>${s.label}</h2>\n${paras(work[key])}`;
  };
  const status = statusLines(work);
  const neighbour = (e, rel) => {
    if (!e) return '';
    const w = works.get(e.slug);
    return `<a class="sequence-item sequence-${rel}" href="${workPath(e.slug)}" rel="${rel}">
<span class="sequence-label">${rel === 'prev' ? 'previous' : 'next'}</span>
<span class="sequence-name">${esc(w.name)}</span>
<span class="sequence-tagline">${esc(w.tagline)}</span>
</a>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(work.description)}" />
<meta name="keywords" content="${esc(work.tags.join(', '))}" />
<meta name="author" content="1mb" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />
<meta name="color-scheme" content="dark light" />
<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(work.description)}" />
<meta property="og:image" content="${SITE}/assets/images/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="1mb, one-man-band. All the hats. One head." />
<meta property="og:site_name" content="1mb" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${url}" />
<link rel="alternate" type="application/atom+xml" title="1mb: work" href="/feed.xml" />
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/assets/fonts/space-grotesk-700-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/assets/css/style.css" />
<script src="/assets/js/theme.js"></script>
<script type="application/ld+json">
${workJsonLd(work, group)}
</script>
</head>
<body class="page-work">
${renderMasthead()}
<main>
<article class="notes">
<p class="notes-side">${GROUPS[group].label}</p>
<h1>${esc(work.name)}</h1>
<p class="notes-tagline">${esc(work.tagline)}</p>
<div class="notes-body">
${paras(work.synopsis)}
${section('why')}
${section('taught')}
</div>
${status.length ? `<p class="notes-status">${status.join(' ')}</p>` : ''}
<p class="notes-next">
<a class="action" href="${esc(primary.href)}">${esc(primary.label)}</a>
${rest.map((a) => `<a href="${esc(a.href)}">${a.label}</a>`).join('\n')}
</p>
${section('related')}
</article>
${prev || next ? `<nav class="sequence" aria-label="more work">\n${neighbour(prev, 'prev')}\n${neighbour(next, 'next')}\n</nav>` : ''}
<p class="all-work"><a href="/#work">all work</a></p>
</main>
${renderColophon()}
<script src="/assets/js/sw-register.js"></script>
<script src="/assets/js/watermark.js"></script>
</body>
</html>
`;
}

/**
 * Atom feed of listed works, newest listing first; each entry is dated by its `listed:` day.
 * Dates are editorial, so the feed is deterministic and never claims a change that did not happen.
 */
export function renderFeed(entries, works, description) {
  const listed = entries
    .map((e) => works.get(e.slug))
    .sort(
      (a, b) =>
        b.listed.localeCompare(a.listed) ||
        b.shipped.localeCompare(a.shipped) ||
        a.name.localeCompare(b.name)
    );
  const stamp = (d) => `${d}T00:00:00Z`;
  const items = listed
    .map(
      (w) => `  <entry>
    <title>${esc(workHeadline(w))}</title>
    <link href="${workUrl(w.slug)}" />
    <id>${workUrl(w.slug)}</id>
    <published>${stamp(w.listed)}</published>
    <updated>${stamp(w.listed)}</updated>
    <summary>${esc(w.description)}</summary>
${w.tags.map((t) => `    <category term="${esc(t)}" />`).join('\n')}
  </entry>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>1mb: work</title>
  <subtitle>${esc(description)}</subtitle>
  <link href="${SITE}/feed.xml" rel="self" />
  <link href="${SITE}/" />
  <id>${SITE}/</id>
  <updated>${stamp(listed[0]?.listed ?? '2026-01-01')}</updated>
  <author><name>1mb</name></author>
  <icon>${SITE}/favicon.ico</icon>
${items}
</feed>
`;
}

export function renderSitemap(entries) {
  const locs = [`${SITE}/`, ...entries.map((e) => workUrl(e.slug))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n')}
</urlset>
`;
}

export function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
