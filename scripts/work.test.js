import { describe, it, expect } from 'vitest';
import {
  actions,
  checkDurable,
  esc,
  parseIndex,
  parseWork,
  renderIndex,
  renderInline,
  renderPage,
  renderSitemap,
  sitemapLocs,
  statusLines,
  validateCollection,
} from './work.js';

const work = (front, body = 'A synopsis.\n\n## Why it exists\n\nA reason.') =>
  `---\n${front}\n---\n\n${body}\n`;

const SIFT = work('name: sift\ntagline: Ranked by depth.\nsite: https://sift.1mb.dev');

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

  it('requires https URLs and boolean flags', () => {
    expect(() => parseWork(work('name: a\ntagline: t\nsite: http://a.dev'), 'a')).toThrow(
      'site must be an https:// URL'
    );
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

  it('allows emphasis at the start of a paragraph', () => {
    const w = parseWork(work('name: a\ntagline: t', '*Quiet* on purpose.\n\n## Why it exists\n\nW.'), 'a');
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
    expect(() => renderInline('[x](javascript:alert(1))', 'f.md', 4)).toThrow('f.md:4 link must be');
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
    expect(statusLines({ ...src, maintained: true })).toEqual(['Source is public, and kept current.']);
    expect(statusLines({ ...src, maintained: false })).toEqual([
      'Source stays public. No longer maintained.',
    ]);
  });

  it('names the write-up for a retired instance', () => {
    expect(statusLines({ ...base, retired: true, site: 'https://www.nivo.com' })[0]).toBe(
      'No longer running. The write-up stays at <a href="https://www.nivo.com">nivo.com</a>.'
    );
  });

  it("leads with the group's first action, then each remaining link once", () => {
    const w = { ...base, site: 'https://w.dev', source: 'https://github.com/x/w', docs: 'https://d.dev' };
    expect(actions(w, 'use')).toEqual({
      primary: { href: 'https://w.dev', label: 'open w' },
      rest: [
        { href: 'https://github.com/x/w', label: 'source' },
        { href: 'https://d.dev', label: 'docs' },
      ],
    });
    expect(actions(w, 'build').primary).toEqual({ href: 'https://github.com/x/w', label: 'get w' });
  });
});

describe('collection rules', () => {
  const entries = parseIndex('use\n  sift\nbuild\n  ledgerq\n');

  it('requires a file and a first-action target for every listed work', () => {
    const works = new Map([['sift', parseWork(SIFT, 'sift')]]);
    expect(() => validateCollection(entries, works)).toThrow('content/index.txt:4 no file');

    works.set('ledgerq', parseWork(work('name: ledgerq\ntagline: q'), 'ledgerq'));
    expect(() => validateCollection(entries, works)).toThrow('group "build" needs source or docs');
  });

  it('rejects Related links to unlisted works', () => {
    const draftLink = work(
      'name: sift\ntagline: t\nsite: https://s.dev',
      'S.\n\n## Why it exists\n\nW.\n\n## Related\n\n[d](/work/draft/)'
    );
    const works = new Map([['sift', parseWork(draftLink, 'sift')]]);
    expect(() => validateCollection(parseIndex('use\n  sift'), works)).toThrow('"draft" is not listed');
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
  it('escapes content in rows and pages', () => {
    const w = parseWork(work('name: a&b\ntagline: "<x>"\nsite: https://a.dev'), 'ab');
    const entries = parseIndex('use\n  ab');
    const index = renderIndex(entries, new Map([['ab', w]]));
    const page = renderPage(w, 'use', 1);
    expect(index).toContain('a&amp;b');
    expect(index).not.toContain('<x>');
    expect(page).toContain('content="&quot;&lt;x&gt;&quot;"');
  });

  it('omits the verb link for build entries and empty sides', () => {
    const w = parseWork(work('name: q\ntagline: t\nsource: https://g.dev/q'), 'q');
    const index = renderIndex(parseIndex('build\n  q'), new Map([['q', w]]));
    expect(index).not.toContain('track-verb');
    expect(index).not.toContain('>Use<');
  });

  it('gives each page its own canonical and description', () => {
    const page = renderPage(parseWork(SIFT, 'sift'), 'use', 1);
    expect(page).toContain('<link rel="canonical" href="https://1mb.dev/work/sift/" />');
    expect(page).toContain('<meta property="og:description" content="Ranked by depth." />');
  });

  it('escape helper covers attribute-breaking characters', () => {
    expect(esc(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;'
    );
  });
});
