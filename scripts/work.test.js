import { readdirSync } from 'fs';
import { describe, it, expect } from 'vitest';
import {
  actions,
  checkDurable,
  esc,
  isText,
  parseIndex,
  parseWork,
  renderColophon,
  renderIndex,
  renderInline,
  renderMasthead,
  renderPage,
  renderSitemap,
  sitemapLocs,
  statusLines,
  validateCollection,
  renderFeed,
  workJsonLd,
} from './work.js';

const work = (front, body = 'A synopsis.\n\n## Why it exists\n\nA reason.') =>
  `---\n${front}\n---\n\n${body}\n`;

const SEO =
  'description: A description long enough to stand as the snippet shown in a search result.\ntags: one, two, three';

const SIFT = work(
  `name: sift\ntagline: Ranked by depth.\nsite: https://sift.1mb.dev\nshipped: 2026-02-22\nlisted: 2026-03-01\n${SEO}`
);

describe('parseIndex', () => {
  it('numbers works across groups in display order, whatever the file order', () => {
    const entries = parseIndex('build\n  ledgerq\nuse\n  sift\n  gist\n');
    expect(entries.map((e) => [e.slug, e.group, e.no])).toEqual([
      ['sift', 'use', 1],
      ['gist', 'use', 2],
      ['ledgerq', 'build', 3],
    ]);
  });

  it('ignores comments and blank lines', () => {
    expect(parseIndex('# note\n\nuse\n  # skip\n  sift\n')).toHaveLength(1);
  });

  it('rejects unknown groups, orphan slugs and duplicates with file:line', () => {
    expect(() => parseIndex('apps\n  sift')).toThrow('content/index.txt:1 unknown group "apps"');
    expect(() => parseIndex('  sift')).toThrow(':1 "sift" is listed before any group');
    expect(() => parseIndex('use\n  sift\n  sift')).toThrow(':3 "sift" is listed twice');
  });
});

describe('parseWork', () => {
  it('parses front matter and sections', () => {
    const w = parseWork(
      work(
        'name: ledgerq\ntagline: A queue.\nsource: https://github.com/x/ledgerq\nretired: true',
        'One.\n\nTwo\ncontinued.\n\n## Why it exists\n\nWhy.\n\n## What it taught\n\nTaught.\n\n## Related\n\n[sift](/work/sift/)'
      ),
      'ledgerq'
    );
    expect(w.name).toBe('ledgerq');
    expect(w.retired).toBe(true);
    expect(w.maintained).toBeUndefined();
    expect(w.synopsis.map((p) => p.text)).toEqual(['One.', 'Two continued.']);
    expect(w.why[0].text).toBe('Why.');
    expect(w.taught[0].text).toBe('Taught.');
    expect(w.related).toEqual([{ text: 'sift', href: '/work/sift/', line: 23 }]);
  });

  it('rejects unknown and duplicate keys at their line', () => {
    expect(() => parseWork(work('name: a\nrepo: https://x'), 'a')).toThrow(
      'content/work/a.md:3 unknown key "repo"'
    );
    expect(() => parseWork(work('name: a\nname: b'), 'a')).toThrow(':3 duplicate key "name"');
  });

  it('requires real calendar dates for shipped and listed', () => {
    expect(parseWork(work('name: a\ntagline: t\nshipped: 2024-02-29'), 'a').shipped).toBe(
      '2024-02-29'
    );
    expect(() => parseWork(work('name: a\ntagline: t\nshipped: 2025-02-29'), 'a')).toThrow(
      ':4 shipped must be a date'
    );
    expect(() => parseWork(work('name: a\ntagline: t\nshipped: 2025-13-01'), 'a')).toThrow(
      ':4 shipped must be a date'
    );
    expect(() => parseWork(work('name: a\ntagline: t\nshipped: Oct 2025'), 'a')).toThrow(
      'shipped must be a date'
    );
    expect(() => parseWork(work('name: a\ntagline: t\nlisted: 2025-02-30'), 'a')).toThrow(
      ':4 listed must be a date'
    );
  });

  it('rejects a listing before the work went live, at the listed line', () => {
    expect(() =>
      parseWork(work('name: a\ntagline: t\nlisted: 2025-01-01\nshipped: 2025-06-01'), 'a')
    ).toThrow(':4 listed must not precede shipped');
    const same = parseWork(
      work('name: a\ntagline: t\nshipped: 2025-06-01\nlisted: 2025-06-01'),
      'a'
    );
    expect(same.listed).toBe('2025-06-01');
  });

  it('rejects time words that go stale, at their line, outside code', () => {
    expect(() => parseWork(work('name: a\ntagline: Currently a queue'), 'a')).toThrow(
      ':3 "Currently" goes stale'
    );
    expect(() => parseWork(work('name: a\ntagline: t', 'S.\n\nNow it is a record.'), 'a')).toThrow(
      ':8 "Now" goes stale'
    );
    const fine = work(
      'name: a\ntagline: Known to snow',
      'Nowhere else. Run `now`.\n\n## Why it exists\n\nW.'
    );
    expect(parseWork(fine, 'a').synopsis[0].text).toBe('Nowhere else. Run `now`.');
    const linked = work(
      'name: a\ntagline: t',
      'See [the docs](https://a.dev/releases/latest).\n\n## Why it exists\n\nW.'
    );
    expect(parseWork(linked, 'a').synopsis).toHaveLength(1);
    expect(() =>
      parseWork(work('name: a\ntagline: t', 'See [the latest](https://a.dev/).'), 'a')
    ).toThrow(':6 "latest" goes stale');
  });

  it('keeps a tagline to one sentence', () => {
    expect(() => parseWork(work('name: a\ntagline: One. Two.'), 'a')).toThrow(
      'tagline must be one sentence'
    );
  });

  it('keeps the page title within 70 characters', () => {
    const long = 'Quite a long tagline that would push the page title past the limit.';
    expect(() => parseWork(work(`name: something\ntagline: ${long}`), 'a')).toThrow(
      'shorten the tagline'
    );
  });

  it('requires https URLs and boolean flags', () => {
    expect(() => parseWork(work('name: a\ntagline: t\nsite: http://a.dev'), 'a')).toThrow(
      'site must be an https:// URL'
    );
    const padded = parseWork(
      work('name: a\ntagline: t\nsite: https://a.dev \nshipped: 2025-01-01 '),
      'a'
    );
    expect([padded.site, padded.shipped]).toEqual(['https://a.dev', '2025-01-01']);
    expect(() => parseWork(work('name: a\ntagline: t\nretired: yes'), 'a')).toThrow(
      'retired must be true or false'
    );
  });

  it('requires name, tagline, synopsis and why; caps tagline length', () => {
    expect(() => parseWork(work('tagline: t'), 'a')).toThrow('missing "name"');
    expect(() => parseWork(work('name: a'), 'a')).toThrow('missing "tagline"');
    expect(() => parseWork(work(`name: a\ntagline: ${'x'.repeat(81)}`), 'a')).toThrow('max 80');
    expect(() => parseWork(work('name: a\ntagline: t', '## Why it exists\n\nW.'), 'a')).toThrow(
      'missing synopsis'
    );
    expect(() => parseWork(work('name: a\ntagline: t', 'S.'), 'a')).toThrow(
      'missing "## Why it exists"'
    );
  });

  it('rejects markup outside the subset, at its line', () => {
    const bad = (body) => () => parseWork(work('name: a\ntagline: t', body), 'a');
    expect(bad('S.\n\n## Why it exists\n\n- a list')).toThrow(':10 unsupported markup');
    expect(bad('S.\n\n## Why it exists\n\nW.\n\n### Deep')).toThrow('unsupported heading');
    expect(bad('S.\n\n## Why it exists\n\n<b>raw</b>')).toThrow('unsupported markup');
    expect(bad('S.\n\n## What it taught\n\nT.\n\n## Why it exists\n\nW.')).toThrow(
      'out of order or repeated'
    );
    expect(bad('S.\n\n## Why it exists\n\nW.\n\n## Related\n\nsee [x](https://a.b)')).toThrow(
      'each Related line must be one [text](url)'
    );
  });

  it('rejects em-dashes anywhere in a work file', () => {
    expect(() => parseWork(work('name: a\ntagline: one — two'), 'a')).toThrow(
      'content/work/a.md:3 em-dash in copy'
    );
    expect(() =>
      parseWork(work('name: a\ntagline: t', 'S &mdash; s.\n\n## Why it exists\n\nW.'), 'a')
    ).toThrow(':6 em-dash in copy');
  });

  it('allows emphasis at the start of a paragraph', () => {
    const w = parseWork(
      work('name: a\ntagline: t', '*Quiet* on purpose.\n\n## Why it exists\n\nW.'),
      'a'
    );
    expect(w.synopsis[0].text).toBe('*Quiet* on purpose.');
  });
});

describe('renderInline', () => {
  it('renders links, emphasis and code, escaping everything else', () => {
    expect(renderInline('Tom & `a<b>` see [x](https://a.dev/?q=1&r=2) *now*')).toBe(
      'Tom &amp; <code>a&lt;b&gt;</code> see <a href="https://a.dev/?q=1&amp;r=2">x</a> <em>now</em>'
    );
  });

  it('rejects non-https links', () => {
    expect(() => renderInline('[x](javascript:alert(1))', 'f.md', 4)).toThrow(
      'f.md:4 link must be'
    );
    expect(() => renderInline('[x](http://a.dev)')).toThrow('link must be');
  });
});

describe('status and actions', () => {
  const base = { name: 'w', related: [] };

  it('says nothing for a live work, and nothing about private source', () => {
    expect(statusLines({ ...base, site: 'https://w.dev' })).toEqual([]);
  });

  it('claims upkeep only when the file says so', () => {
    const src = { ...base, source: 'https://github.com/x/w' };
    expect(statusLines(src)).toEqual(['Source is public.']);
    expect(statusLines({ ...src, maintained: true })).toEqual([
      'Source is public and kept current.',
    ]);
    expect(statusLines({ ...src, maintained: false })).toEqual([
      'Source stays public. No longer maintained.',
    ]);
  });

  it('names the write-up for a retired instance', () => {
    expect(statusLines({ ...base, retired: true, site: 'https://www.nivo.com' })[0]).toBe(
      'No longer running. The write-up stays at nivo.com.'
    );
  });

  it("leads with the group's first action, then each remaining link once", () => {
    const w = {
      ...base,
      site: 'https://w.dev',
      source: 'https://github.com/x/w',
      docs: 'https://d.dev',
    };
    expect(actions(w, 'use')).toEqual({
      primary: { href: 'https://w.dev', verb: 'open', label: 'open w' },
      rest: [
        { href: 'https://github.com/x/w', label: 'source' },
        { href: 'https://d.dev', label: 'docs' },
      ],
    });
    expect(actions(w, 'build').primary).toEqual({
      href: 'https://github.com/x/w',
      verb: 'get',
      label: 'get w',
    });
  });
});

describe('search fields', () => {
  const parse = (front) => parseWork(work(`name: a\ntagline: t\n${front}`), 'a');
  const long = 'x'.repeat(161);

  it('accepts a description from 70 to 160 characters', () => {
    expect(parse(`description: ${'x'.repeat(70)}`).description).toHaveLength(70);
    expect(parse(`description: ${'x'.repeat(160)}`).description).toHaveLength(160);
    expect(() => parse(`description: ${'x'.repeat(69)}`)).toThrow('description is 69 chars');
    expect(() => parse(`description: ${long}`)).toThrow('description is 161 chars');
  });

  it('rejects a time word in a description', () => {
    const stale = `description: The latest ${'x'.repeat(70)}`;
    expect(() => parse(stale)).toThrow();
  });

  it('parses three to six lowercase tags', () => {
    expect(parse('tags: go, message queue, c++').tags).toEqual(['go', 'message queue', 'c++']);
    expect(() => parse('tags: a, b')).toThrow('2 tags (3 to 6)');
    expect(() => parse('tags: a, b, c, d, e, f, g')).toThrow('7 tags (3 to 6)');
    expect(() => parse('tags: a, b, a')).toThrow('duplicate tag');
    expect(() => parse('tags: a, b, Go')).toThrow('tag "Go" must be lowercase');
  });

  it('requires both on a listed work, not on a draft', () => {
    const dates = 'site: https://a.dev\nshipped: 2026-01-01\nlisted: 2026-01-02';
    const entries = parseIndex('use\n  a\n');
    const check = (front) => validateCollection(entries, new Map([['a', parse(front)]]));
    expect(() => check(dates)).toThrow('listed works need "description: ..."');
    expect(() => check(`${dates}\ndescription: ${'x'.repeat(70)}`)).toThrow(
      'listed works need "tags: a, b, c"'
    );
    expect(() => check(`${dates}\n${SEO}`)).not.toThrow();
    expect(parse('site: https://a.dev').description).toBeUndefined();
  });
});

describe('collection rules', () => {
  const entries = parseIndex('use\n  sift\nbuild\n  ledgerq\n');

  it('requires a file and a first-action target for every listed work', () => {
    const works = new Map([['sift', parseWork(SIFT, 'sift')]]);
    expect(() => validateCollection(entries, works)).toThrow('content/index.txt:4 no file');

    works.set('ledgerq', parseWork(work('name: ledgerq\ntagline: q'), 'ledgerq'));
    expect(() => validateCollection(entries, works)).toThrow(
      'listed works need "shipped: YYYY-MM-DD"'
    );

    works.set(
      'ledgerq',
      parseWork(work('name: ledgerq\ntagline: q\nshipped: 2025-10-17'), 'ledgerq')
    );
    expect(() => validateCollection(entries, works)).toThrow(
      'listed works need "listed: YYYY-MM-DD"'
    );

    works.set(
      'ledgerq',
      parseWork(
        work(`name: ledgerq\ntagline: q\nshipped: 2025-10-17\nlisted: 2026-01-01\n${SEO}`),
        'ledgerq'
      )
    );
    expect(() => validateCollection(entries, works)).toThrow('group "build" needs source or docs');
  });

  it('rejects Related links to unlisted works', () => {
    const draftLink = work(
      `name: sift\ntagline: t\nsite: https://s.dev\nshipped: 2026-01-01\nlisted: 2026-01-01\n${SEO}`,
      'S.\n\n## Why it exists\n\nW.\n\n## Related\n\n[d](/work/draft/)'
    );
    const works = new Map([['sift', parseWork(draftLink, 'sift')]]);
    expect(() => validateCollection(parseIndex('use\n  sift'), works)).toThrow(
      '"draft" is not listed'
    );
  });

  it('never lets a published /work/ page disappear', () => {
    const previous = sitemapLocs(renderSitemap(entries));
    expect(() => checkDurable(previous, entries)).not.toThrow();
    expect(() => checkDurable(previous, parseIndex('use\n  sift'))).toThrow(
      'published pages would disappear: https://1mb.dev/work/ledgerq/'
    );
  });
});

describe('rendering', () => {
  const pageFor = (w, group = 'use', opts = {}) =>
    renderPage(w, { slug: w.slug, group }, { works: new Map([[w.slug, w]]), ...opts });

  it('escapes content in rows and pages', () => {
    const snippet = '"<x>" and enough other words to stand as the snippet in a search result.';
    const front = `name: a&b\ntagline: "<x>"\nsite: https://a.dev\ndescription: ${snippet}\ntags: a, b, c`;
    const w = parseWork(work(front), 'ab');
    const index = renderIndex(parseIndex('use\n  ab'), new Map([['ab', w]]));
    expect(index).toContain('a&amp;b');
    expect(index).not.toContain('<x>');
    expect(pageFor(w)).toContain('content="&quot;&lt;x&gt;&quot; and enough other words');
  });

  it('gives every side the same row anatomy; build rows link the verb to source', () => {
    const w = parseWork(work('name: q\ntagline: t\nsource: https://g.dev/q'), 'q');
    const index = renderIndex(parseIndex('build\n  q'), new Map([['q', w]]));
    expect(index).toContain(
      '<a class="track-verb" href="https://g.dev/q" aria-label="get q">get</a>'
    );
    expect(index).not.toContain('>use<');
  });

  it('continues list numbering across sides for assistive tech', () => {
    const works = new Map([
      ['s', parseWork(SIFT.replace('name: sift', 'name: s'), 's')],
      ['q', parseWork(work('name: q\ntagline: t\nsource: https://g.dev/q'), 'q')],
    ]);
    const index = renderIndex(parseIndex('use\n  s\nbuild\n  q'), works);
    expect(index).toContain('<ol class="tracks" start="1">');
    expect(index).toContain('<ol class="tracks" start="2">');
    expect(index).toContain('<span class="track-no" aria-hidden="true">02</span>');
  });

  it('gives each side an id and links the bridge only past the trigger', () => {
    const w = (slug) =>
      parseWork(work(`name: ${slug}\ntagline: t\nsite: https://${slug}.dev`), slug);
    const slugs = (n, p) => Array.from({ length: n }, (_, i) => `${p}${i}`);
    const index = (use, read) => {
      const all = [...slugs(use, 'u'), ...slugs(read, 'r')];
      const text = `use\n${slugs(use, 'u')
        .map((s) => `  ${s}`)
        .join('\n')}\nread\n${slugs(read, 'r')
        .map((s) => `  ${s}`)
        .join('\n')}`;
      return renderIndex(parseIndex(text), new Map(all.map((s) => [s, w(s)])));
    };

    const short = index(12, 3);
    expect(short).toContain('<h3 class="side" id="use">use</h3>');
    expect(short).toContain('>Use it. Read it. Build with it.</h2>');

    const longSide = index(13, 1);
    expect(longSide).toContain(
      '<a href="#use">Use it</a>. <a href="#read">Read it</a>. Build with it.'
    );

    const atSixteen = index(9, 7);
    expect(atSixteen).toContain('<a href="#use">Use it</a>.');
  });

  it('gives each page its own canonical and description', () => {
    const page = pageFor(parseWork(SIFT, 'sift'));
    expect(page).toContain('<link rel="canonical" href="https://1mb.dev/work/sift/" />');
    expect(page).toContain(
      '<meta property="og:description" content="A description long enough to stand as the snippet shown in a search result." />'
    );
  });

  it('shows the side, not a track number, on a work page', () => {
    const page = pageFor(parseWork(SIFT, 'sift'));
    expect(page).toContain('<p class="notes-side">use</p>');
  });

  it('links neighbours by name and leaves an end empty instead of wrapping', () => {
    const a = parseWork(SIFT.replace('name: sift', 'name: alpha'), 'alpha');
    const b = parseWork(SIFT.replace('name: sift', 'name: beta'), 'beta');
    const works = new Map([
      ['alpha', a],
      ['beta', b],
    ]);
    const first = renderPage(a, { slug: 'alpha', group: 'use' }, { next: { slug: 'beta' }, works });
    expect(first).toContain('class="sequence-item sequence-next" href="/work/beta/" rel="next"');
    expect(first).toContain('<span class="sequence-name">beta</span>');
    expect(first).not.toContain('sequence-prev');
    const only = pageFor(a);
    expect(only).not.toContain('class="sequence"');
  });

  it('puts the same masthead and colophon on every page', () => {
    const page = pageFor(parseWork(SIFT, 'sift'));
    expect(page).toContain(renderMasthead());
    expect(page).toContain(renderColophon());
    expect(renderColophon()).toContain('hidden>'); // toggle absent without JS
    expect(renderColophon()).toMatch(
      /^<footer class="colophon">\n<p class="colophon-home"><a href="\/">1mb<\/a> ·<\/p>\n<p class="colophon-credit">All the hats\. One head\.<\/p>/
    );
    expect(renderColophon()).toMatch(
      /feed<\/a>\n<span>© <span class="year">\d{4}<\/span><\/span>\n<\/p>\n<\/footer>$/
    );
  });

  it('describes a work in structured data with public facts only', () => {
    const ld = (w, g) => JSON.parse(workJsonLd(w, g));
    const live = ld(parseWork(SIFT, 'sift'), 'use');
    expect(live.about).toEqual({
      '@type': 'WebApplication',
      url: 'https://sift.1mb.dev',
      name: 'sift',
      description: 'A description long enough to stand as the snippet shown in a search result.',
      keywords: 'one, two, three',
      creator: { '@type': 'Organization', '@id': 'https://1mb.dev/#org', name: '1mb' },
      datePublished: '2026-02-22',
    });
    expect(live.isPartOf['@id']).toBe('https://1mb.dev/#website');
    expect(live.breadcrumb.itemListElement[1].item).toBe('https://1mb.dev/work/sift/');

    const lib = parseWork(work(`name: q\ntagline: t\nsource: https://github.com/x/q\n${SEO}`), 'q');
    expect(ld(lib, 'build').about.codeRepository).toBe('https://github.com/x/q');
    expect(ld(lib, 'build').about).not.toHaveProperty('programmingLanguage');

    const front = `name: q\ntagline: t\nsource: https://github.com/x/q\ndocs: https://d.dev/q\nlanguage: Go\n${SEO}`;
    const documented = ld(parseWork(work(front), 'q'), 'build').about;
    expect(documented.programmingLanguage).toBe('Go');
    expect(documented.sameAs).toBe('https://d.dev/q');
    expect(documented).not.toHaveProperty('url');
  });

  it('carries the authored description and tags into page, data and feed', () => {
    const w = parseWork(SIFT, 'sift');
    const page = pageFor(w);
    const snippet = 'A description long enough to stand as the snippet shown in a search result.';
    expect(page).toContain(`<meta name="description" content="${snippet}" />`);
    expect(page).toContain(`<meta property="og:description" content="${snippet}" />`);
    expect(page).toContain('<meta name="keywords" content="one, two, three" />');
    const data = JSON.parse(workJsonLd(w, 'use'));
    expect(data.description).toBe(snippet);
    expect(data.about.keywords).toBe('one, two, three');
    const feed = renderFeed([{ slug: 'sift', group: 'use' }], new Map([['sift', w]]), 'x');
    expect(feed).toContain(`<summary>${snippet}</summary>`);
    expect(feed).toContain('<category term="two" />');
  });

  it('titles a page by what the work is', () => {
    const page = pageFor(parseWork(SIFT, 'sift'));
    expect(page).toContain('<title>sift: Ranked by depth · 1mb</title>');
    expect(JSON.parse(workJsonLd(parseWork(SIFT, 'sift'), 'use')).about.datePublished).toBe(
      '2026-02-22'
    );
  });

  it('lists works in the feed newest listing first, escaped', () => {
    const q = (listed) =>
      parseWork(
        work(
          `name: q&a\ntagline: t\nsource: https://g.dev/q\nshipped: 2025-01-01\nlisted: ${listed}\n${SEO}`
        ),
        'q'
      );
    const index = parseIndex('use\n  sift\nbuild\n  q');
    // q went live a year before sift but joined the index after it: q leads, dated by its listing.
    const works = new Map([
      ['sift', parseWork(SIFT, 'sift')],
      ['q', q('2026-04-01')],
    ]);
    const feed = renderFeed(index, works, 'About <1mb>.');
    expect(feed.indexOf('/work/q/')).toBeLessThan(feed.indexOf('/work/sift/'));
    expect(feed).toContain('<updated>2026-04-01T00:00:00Z</updated>\n  <author>');
    expect(feed).toContain('<published>2026-04-01T00:00:00Z</published>');
    expect(feed).not.toContain('2025-01-01T');
    expect(feed).toContain('<title>q&amp;a: t</title>');
    expect(feed).toContain('<subtitle>About &lt;1mb&gt;.</subtitle>');

    // Listed the same day (the launch): the newer work leads.
    works.set('q', q('2026-03-01'));
    const tied = renderFeed(index, works, 'About <1mb>.');
    expect(tied.indexOf('/work/sift/')).toBeLessThan(tied.indexOf('/work/q/'));
  });

  it('keeps a script block intact when copy contains "</"', () => {
    const w = parseWork(work(`name: a\ntagline: x </script> y\nsite: https://a.dev\n${SEO}`), 'a');
    expect(workJsonLd(w, 'use')).not.toContain('</script>');
  });

  it('escape helper covers attribute-breaking characters', () => {
    expect(esc(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;'
    );
  });
});

describe('em-dash scan coverage', () => {
  it('reads every file under docs/ that is not binary', () => {
    const binary = /\.(png|ico|woff2|jpg|webp)$/;
    const unread = readdirSync('docs', { recursive: true, withFileTypes: true })
      .filter(
        (e) => e.isFile() && !e.name.startsWith('.') && !isText(e.name) && !binary.test(e.name)
      )
      .map((e) => e.name);
    expect(unread).toEqual([]);
  });

  it('skips binary assets', () => {
    expect(isText('og-image.png')).toBe(false);
    expect(isText('site.webmanifest')).toBe(true);
    expect(isText('security.txt')).toBe(true);
    expect(isText('_headers')).toBe(true);
  });
});
