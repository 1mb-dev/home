import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync('docs/assets/js/counter.js', 'utf8');

function element() {
  const classes = new Set();
  const attrs = new Map();
  const listeners = {};
  return {
    textContent: '',
    disabled: false,
    focused: 0,
    writes: [],
    attrs,
    classes,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    },
    setAttribute: (k, v) => attrs.set(k, v),
    removeAttribute: (k) => attrs.delete(k),
    addEventListener: (type, fn) => (listeners[type] = fn),
    click: () => listeners.click(),
    focus() {
      this.focused += 1;
    },
  };
}

const json = (count) => ({ ok: true, json: async () => ({ count }) });
const settle = () => new Promise((r) => setImmediate(r));

// replies: one per fetch, in order; a function supplies a promise of its own.
async function page({ voted = false, replies = [], storage = true } = {}) {
  const els = { counter: element(), count: element(), 'count-btn': element() };
  let text = '';
  Object.defineProperty(els.count, 'textContent', {
    get: () => text,
    set(v) {
      text = v;
      els.count.writes.push(v);
    },
  });
  const posts = [];
  const store = new Map(voted ? [['1mb_voted', 'true']] : []);
  const document = {
    activeElement: els['count-btn'],
    getElementById: (id) => els[id],
  };
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
  const fetch = (_url, init) => {
    if (init?.method === 'POST') posts.push(init);
    const next = replies.shift();
    return typeof next === 'function' ? next() : Promise.resolve(next);
  };
  runInNewContext(SOURCE, { document, localStorage, fetch, Error, console });
  await settle();
  return { ...els, button: els['count-btn'], posts, store };
}

describe('counter', () => {
  it('shows the count beside the button before a vote', async () => {
    const { count, counter } = await page({ replies: [json(103)] });
    expect(count.textContent).toBe('103 in');
    expect(counter.classes.has('in')).toBe(false);
  });

  it.each([
    [103, "you're in with 102 others"],
    [2, "you're in with 1 other"],
    [1, "you're in"],
    [0, "you're in"],
  ])('reads a returning voter at count %i', async (n, text) => {
    const { count, counter } = await page({ voted: true, replies: [json(n)] });
    expect(count.textContent).toBe(text);
    expect(counter.classes.has('in')).toBe(true);
  });

  it('shows nothing beside the button at zero or with no count', async () => {
    expect((await page({ replies: [json(0)] })).count.textContent).toBe('');
    const down = await page({ replies: [() => Promise.reject(new Error('down'))] });
    expect(down.count.textContent).toBe('');
  });

  it('says you are in when a returning voter has no count', async () => {
    const { count } = await page({
      voted: true,
      replies: [() => Promise.reject(new Error('down'))],
    });
    expect(count.textContent).toBe("you're in");
  });

  it('writes a returning voter once, when the count lands', async () => {
    const { count } = await page({ voted: true, replies: [json(103)] });
    expect(count.writes).toEqual(["you're in with 102 others"]);
  });

  it('moves focus to the section on a vote and remembers it', async () => {
    const { button, count, counter, store } = await page({ replies: [json(103), json(104)] });
    button.click();
    await settle();
    expect(count.textContent).toBe("you're in with 103 others");
    expect(counter.classes.has('in')).toBe(true);
    expect(counter.focused).toBe(1);
    expect(store.get('1mb_voted')).toBe('true');
  });

  it('never disables the button, so Enter reaches try again', async () => {
    const { button, count, posts } = await page({
      replies: [json(103), { ok: false, status: 500 }, json(104)],
    });
    button.click();
    expect(button.disabled).toBe(false);
    await settle();
    expect(button.textContent).toBe('try again');
    expect(button.classes.has('error')).toBe(true);
    expect(count.textContent).toBe('103 in');

    button.click();
    await settle();
    expect(posts).toHaveLength(2);
    expect(count.textContent).toBe("you're in with 103 others");
  });

  it('ignores a second click while a vote is out', async () => {
    const { button, posts } = await page({ replies: [json(103), json(104)] });
    button.click();
    button.click();
    await settle();
    expect(posts).toHaveLength(1);
  });

  it('keeps the POST count when an older GET lands after it', async () => {
    let releaseGet;
    const slowGet = () => new Promise((r) => (releaseGet = () => r(json(103))));
    const { button, count } = await page({ replies: [slowGet, json(104)] });
    button.click();
    await settle();
    releaseGet();
    await settle();
    expect(count.textContent).toBe("you're in with 103 others");
  });

  it('survives storage that throws', async () => {
    const { button, count } = await page({ storage: false, replies: [json(103), json(104)] });
    button.click();
    await settle();
    expect(count.textContent).toBe("you're in with 103 others");
  });
});
