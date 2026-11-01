import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('docs/assets/css/style.css', 'utf8');

// The custom properties of the first rule opening with this exact text.
function tokens(open) {
  const start = css.indexOf(open);
  if (start === -1) throw new Error(`no rule opens with: ${open}`);
  const body = css.slice(start + open.length, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value])
  );
}

const lightRoot = tokens(':root {');
const darkMedia = tokens('@media (prefers-color-scheme: dark) {\n  :root {');
const darkAttr = tokens("[data-theme='dark'] {");
const lightAttr = tokens("[data-theme='light'] {");

const rgb = (hex) => {
  const h = hex.slice(1);
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

// What a browser paints: the blend lands on 8-bit values.
const over = (ink, paper, alpha) =>
  ink.map((c, i) => Math.round(c * alpha + paper[i] * (1 - alpha)));

const luminance = ([r, g, b]) => {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('theme values', () => {
  it('agree across the blocks that repeat them', () => {
    expect(lightRoot).toMatchObject(lightAttr);
    expect(darkAttr).toEqual(darkMedia);
    // A token the light block drops leaks the dark media value onto a light page.
    expect(Object.keys(lightAttr).sort()).toEqual(Object.keys(darkMedia).sort());
  });

  it.each(['docs/index.html', 'docs/404.html', 'scripts/work.js'])(
    'match the theme-color metas in %s',
    (file) => {
      const text = readFileSync(file, 'utf8');
      const meta = (scheme) =>
        new RegExp(
          `name="theme-color" content="(#\\w+)" media="\\(prefers-color-scheme: ${scheme}\\)"`
        ).exec(text)[1];
      expect(meta('dark')).toBe(darkMedia.bg);
      expect(meta('light')).toBe(lightRoot.bg);
    }
  );

  it('match the manifest and the icon script, which stand on the dark paper', () => {
    const manifest = JSON.parse(readFileSync('docs/site.webmanifest', 'utf8'));
    expect(manifest.background_color).toBe(darkMedia.bg);
    expect(manifest.theme_color).toBe(darkMedia.bg);
    expect(/^BG = "(#\w+)"/m.exec(readFileSync('scripts/icons/outline.py', 'utf8'))[1]).toBe(
      darkMedia.bg
    );
  });
});

describe('the watermark', () => {
  // 4.5 is AA and passes light at 6%, which design.md refuses. A floor at 1.08 passes dark at 5%.
  it.each([
    ['light', lightRoot, 1.08],
    ['dark', darkMedia, 1.1],
  ])('keeps muted text readable and the numeral present in %s', (_name, theme, presence) => {
    const paper = rgb(theme.bg);
    const blend = over(rgb(theme.fg), paper, Number(theme.watermark));
    expect(contrast(rgb(theme.muted), blend)).toBeGreaterThanOrEqual(4.6);
    expect(contrast(blend, paper)).toBeGreaterThanOrEqual(presence);
  });
});
