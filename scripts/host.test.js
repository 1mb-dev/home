import { readFileSync } from 'fs';
import { it, expect } from 'vitest';

// counter.js fails silent on a wrong host, and local previews carry no CSP: nothing else goes red.
it('the client, the CSP and the preconnect name one API host, and only the root may connect', () => {
  const api = /API_URL = '([^']+)'/.exec(readFileSync('docs/assets/js/counter.js', 'utf8'))[1];
  const connect = [...readFileSync('docs/_headers', 'utf8').matchAll(/connect-src ([^;]+);/g)];
  expect(api).toBe('https://counter.1mb.dev');
  expect(connect).toHaveLength(1);
  expect(connect[0][1].split(' ')).toContain(api);
  expect(readFileSync('docs/index.html', 'utf8')).toContain(`rel="preconnect" href="${api}"`);
});
