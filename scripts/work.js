/**
 * Work index: parse content/, validate, render HTML.
 *
 * Pure functions only; scripts/gen.js does the file IO.
 * The content format is a deliberate subset (see DESIGN.md, "Content format"):
 * anything outside it is an error, never silently dropped.
 */

export const SITE = 'https://1mb.dev';

// Group = the work's first action. Order here is display order on the root.
export const GROUPS = {
  use: { label: 'Use', verb: 'open' },
  read: { label: 'Read', verb: 'read' },
  build: { label: 'Build with', verb: 'get' },
};

const KEYS = new Set(['name', 'tagline', 'site', 'source', 'docs', 'retired', 'maintained']);
const URL_KEYS = new Set(['site', 'source', 'docs']);
const BOOL_KEYS = new Set(['retired', 'maintained']);

// Body sections, in the only order they may appear. Synopsis is the text before the first heading.
const SECTIONS = [
  { heading: 'Why it exists', key: 'why', label: 'why it exists', required: true },
  { heading: 'What it taught', key: 'taught', label: 'what it taught', required: false },
  { heading: 'Related', key: 'related', label: 'related', required: false },
];

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const TAGLINE_MAX = 80;
const PARAGRAPH_MAX = 400;

export class ContentError extends Error {
  constructor(file, line, message) {
    super(`${file}:${line} ${message}`);
    this.name = 'ContentError';
  }
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

/**
 * content/work/{slug}.md -> { slug, name, tagline, site?, source?, docs?, retired, maintained,
 *                             synopsis: [para], why: [para], taught: [para], related: [link] }
 * Paragraphs are kept as { text, line } so inline errors can point at the source line.
 */
export function parseWork(text, slug, file = `content/work/${slug}.md`) {
  if (!SLUG.test(slug)) throw new ContentError(file, 1, `invalid slug "${slug}"`);

  const lines = text.split('\n');
  if (lines[0] !== '---') throw new ContentError(file, 1, 'expected front matter opening "---"');

  // maintained stays undefined unless the file says so: upkeep is an editorial claim, never a default.
  const work = { slug, retired: false, synopsis: [], why: [], taught: [] };
  work.related = [];

  const seen = new Set();
  let i = 1;
  for (; i < lines.length && lines[i] !== '---'; i++) {
    const line = i + 1;
    const match = /^([a-z]+): (.+)$/.exec(lines[i]);
    if (!match) throw new ContentError(file, line, 'expected "key: value"');
    const [, key, value] = match;
    if (!KEYS.has(key)) throw new ContentError(file, line, `unknown key "${key}"`);
    if (seen.has(key)) throw new ContentError(file, line, `duplicate key "${key}"`);
    seen.add(key);
    if (URL_KEYS.has(key) && !/^https:\/\/[^\s]+$/.test(value)) {
      throw new ContentError(file, line, `${key} must be an https:// URL`);
    }
    if (BOOL_KEYS.has(key)) {
      if (value !== 'true' && value !== 'false') {
        throw new ContentError(file, line, `${key} must be true or false`);
      }
      work[key] = value === 'true';
    } else {
      work[key] = value.trim();
    }
  }
  if (i >= lines.length) throw new ContentError(file, 1, 'front matter is not closed with "---"');

  if (!work.name) throw new ContentError(file, 1, 'missing "name"');
  if (!work.tagline) throw new ContentError(file, 1, 'missing "tagline"');
  if (work.tagline.length > TAGLINE_MAX) {
    throw new ContentError(file, 1, `tagline is ${work.tagline.length} chars (max ${TAGLINE_MAX})`);
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

    if (section === 'related') {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(raw.trim());
      if (!link) throw new ContentError(file, line, 'each Related line must be one [text](url)');
      checkHref(link[2], file, line);
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
        throw new ContentError(file, p.line, `paragraph is ${p.text.length} chars (max ${PARAGRAPH_MAX})`);
      }
      renderInline(p.text, file, p.line); // surface inline errors at parse time
    }
  }

  return work;
}

function checkHref(href, file, line) {
  if (/^https:\/\/[^\s]+$/.test(href)) return;
  if (/^\/work\/[a-z0-9-]+\/$/.test(href)) return;
  throw new ContentError(file, line, `link must be https:// or /work/{slug}/: "${href}"`);
}

/**
 * Inline subset: [text](url), *em*, `code`. Everything else is text, escaped.
 */
export function renderInline(text, file = '?', line = 0) {
  const token = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*]+)\*/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = token.exec(text)) !== null) {
    out += plain(text.slice(last, m.index), file, line);
    if (m[1] !== undefined) {
      out += `<code>${esc(m[1])}</code>`;
    } else if (m[2] !== undefined) {
      checkHref(m[3], file, line);
      out += `<a href="${esc(m[3])}">${esc(m[2])}</a>`;
    } else {
      out += `<em>${esc(m[4])}</em>`;
    }
    last = token.lastIndex;
  }
  return out + plain(text.slice(last), file, line);
}

function plain(text, file, line) {
  if (/[`*[\]<>]/.test(text)) {
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
    if (!primaryAction(work, entry.group)) {
      const needs = entry.group === 'build' ? 'source or docs' : 'site';
      throw new ContentError(file, 1, `group "${entry.group}" needs ${needs}`);
    }
  }
  for (const work of works.values()) {
    for (const link of work.related) {
      const slug = /^\/work\/([a-z0-9-]+)\/$/.exec(link.href)?.[1];
      if (slug && !listed.has(slug)) {
        throw new ContentError(`content/work/${work.slug}.md`, link.line, `"${slug}" is not listed`);
      }
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

export function workPath(slug) {
  return `/work/${slug}/`;
}

export function workUrl(slug) {
  return `${SITE}${workPath(slug)}`;
}

function primaryAction(work, group) {
  if (group === 'build') {
    if (work.source) return { href: work.source, label: `get ${work.name}` };
    if (work.docs) return { href: work.docs, label: `get ${work.name}` };
    return null;
  }
  if (!work.site) return null;
  return { href: work.site, label: `${GROUPS[group].verb} ${work.name}` };
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
        ? `No longer running. The write-up stays at <a href="${esc(work.site)}">${esc(host(work.site))}</a>.`
        : 'No longer running.'
    );
  }
  if (work.source) {
    if (work.maintained === true) lines.push('Source is public, and kept current.');
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
 * The root index: sides (groups) of numbered tracks. Numbering runs across sides.
 */
export function renderIndex(entries, works) {
  const sides = Object.keys(GROUPS)
    .map((group) => {
      const rows = entries
        .filter((e) => e.group === group)
        .map((e) => {
          const work = works.get(e.slug);
          const state = rowState(work);
          const verb = group === 'build' ? null : work.site;
          return `<li class="track">
  <span class="track-no">${trackNo(e.no)}</span>
  <span class="track-name"><a href="${workPath(work.slug)}">${esc(work.name)}</a>${
    state ? ` <span class="track-state">${state}</span>` : ''
  }</span>
  ${
    verb
      ? `<span class="track-lead" aria-hidden="true"></span>
  <a class="track-verb" href="${esc(verb)}" aria-label="${GROUPS[group].verb} ${esc(work.name)}">${GROUPS[group].verb}</a>`
      : ''
  }
  <span class="track-tagline">${esc(work.tagline)}</span>
</li>`;
        });
      if (rows.length === 0) return '';
      return `<h2 class="side">${GROUPS[group].label}</h2>
<ol class="tracks">
${rows.join('\n')}
</ol>`;
    })
    .filter(Boolean);

  return `<section id="work" class="work" aria-label="The work">
${sides.join('\n')}
</section>`;
}

/**
 * A work page: liner notes for one track.
 */
export function renderPage(work, group, no) {
  const url = workUrl(work.slug);
  const title = `${work.name} — 1mb`;
  const { primary, rest } = actions(work, group);
  const paras = (list) =>
    list.map((p) => `<p>${renderInline(p.text, `content/work/${work.slug}.md`, p.line)}</p>`).join('\n');
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

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(work.tagline)}" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />
<meta name="color-scheme" content="dark light" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:;" />
<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(work.tagline)}" />
<meta property="og:image" content="${SITE}/assets/images/og-image.png" />
<meta property="og:site_name" content="1mb" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${url}" />
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/assets/fonts/space-grotesk-700-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/assets/css/style.css" />
<script src="/assets/js/theme.js"></script>
</head>
<body class="page-work">
<button type="button" id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
<span class="icon-sun">☀</span>
<span class="icon-moon">☾</span>
</button>
<header class="masthead"><a class="mark" href="/">1mb</a></header>
<main>
<article class="notes">
<p class="notes-no"><span>${trackNo(no)}</span> ${GROUPS[group].label.toLowerCase()}</p>
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
</main>
<footer class="colophon">
<hr class="separator" aria-hidden="true" />
<p>All the hats. One head.</p>
<a href="/#work">all work</a>
</footer>
<script src="/assets/js/sw-register.js"></script>
</body>
</html>
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
