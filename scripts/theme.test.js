import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync('docs/assets/js/theme.js', 'utf8');
const KEY = '1mb_theme_choice';

function page({ saved = null, system = 'light', storage = true } = {}) {
  const dataset = {};
  const root = {
    dataset,
    setAttribute: (name, value) => {
      if (name === 'data-theme') dataset.theme = value;
    },
    getAttribute: (name) => (name === 'data-theme' ? (dataset.theme ?? null) : null),
  };
  const listeners = {};
  const toggle = {
    hidden: true,
    setAttribute: () => {},
    addEventListener: (type, fn) => (listeners[type] = fn),
    click: () => listeners.click(),
  };

  // theme.js runs in the head: the colophon does not exist until the page has parsed.
  let parsed = false;
  let ready = () => {};
  const document = {
    documentElement: root,
    getElementById: (id) => (parsed && id === 'theme-toggle' ? toggle : null),
    addEventListener: (type, fn) => {
      if (type === 'DOMContentLoaded') ready = fn;
    },
  };

  const media = { matches: system === 'dark', addEventListener: (_type, fn) => (media.fn = fn) };
  const window = { matchMedia: () => media };
  const store = new Map(saved ? [[KEY, saved]] : []);
  const localStorage = {
    getItem(k) {
      if (!storage) throw new Error('denied');
      return store.get(k) ?? null;
    },
    setItem(k, v) {
      if (!storage) throw new Error('denied');
      store.set(k, v);
    },
  };

  runInNewContext(SOURCE, { window, document, localStorage, String });
  return {
    root,
    toggle,
    store,
    parse() {
      parsed = true;
      ready();
    },
    systemChange(theme) {
      media.matches = theme === 'dark';
      media.fn();
    },
  };
}

describe('theme', () => {
  it('follows the system with nothing saved', () => {
    expect(page({ system: 'dark' }).root.dataset.theme).toBe('dark');
    expect(page({ system: 'light' }).root.dataset.theme).toBe('light');
  });

  it('sets the theme when storage throws', () => {
    expect(page({ system: 'dark', storage: false }).root.dataset.theme).toBe('dark');
  });

  it('puts a saved choice over the system', () => {
    expect(page({ saved: 'dark', system: 'light' }).root.dataset.theme).toBe('dark');
  });

  it('follows a system change until the reader chooses', () => {
    const free = page({ system: 'light' });
    free.systemChange('dark');
    expect(free.root.dataset.theme).toBe('dark');

    const chosen = page({ saved: 'light', system: 'light' });
    chosen.systemChange('dark');
    expect(chosen.root.dataset.theme).toBe('light');
  });

  it('shows the toggle only once the page has parsed', () => {
    const { toggle, parse } = page();
    expect(toggle.hidden).toBe(true);
    parse();
    expect(toggle.hidden).toBe(false);
  });

  it('saves the choice a click makes, and holds it when storage throws', () => {
    const { toggle, parse, root, store } = page({ system: 'light' });
    parse();
    toggle.click();
    expect(root.dataset.theme).toBe('dark');
    expect(store.get(KEY)).toBe('dark');

    const blocked = page({ system: 'light', storage: false });
    blocked.parse();
    blocked.toggle.click();
    expect(blocked.root.dataset.theme).toBe('dark');
  });
});
