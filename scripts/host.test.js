import { readFileSync } from 'fs';
import { it, expect } from 'vitest';

// counter.js fails silent on a wrong host, and local previews carry no CSP: nothing else goes red.
it('the client, the root CSP and the preconnect name one API host, and only the root may connect', () => {
  const api = /API_URL = '([^']+)'/.exec(readFileSync('docs/assets/js/counter.js', 'utf8'))[1];
  const headers = readFileSync('docs/_headers', 'utf8');
  const root = headers.split('\n\n').find((block) => block.startsWith('/\n'));
  expect(api).toBe('https://counter.1mb.dev');
  // Without the detach the shared CSP also enforces, and it does not allow the API.
  expect(root).toContain('! Content-Security-Policy');
  expect(root.match(/^ {2}Content-Security-Policy:/gm)).toHaveLength(1);
  expect(root).toContain(`connect-src 'self' ${api};`);
  expect(headers.match(/connect-src/g)).toHaveLength(1);
  expect(readFileSync('docs/index.html', 'utf8')).toContain(`rel="preconnect" href="${api}"`);
});
