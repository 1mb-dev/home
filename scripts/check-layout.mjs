// Layout checks in the installed Chrome, by hand before a deploy: npm run check:layout
// CHROME overrides the path. Exits non-zero with what failed; a check that cannot run is a failure.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const ROOT = 'docs';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const STEP_MS = 15000;
const SIZES = [
  { width: 320, height: 640, mobile: true },
  { width: 375, height: 812, mobile: true },
  { width: 1280, height: 800, mobile: false },
];
const MIME = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const notFound = new Set();

function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    let file = join(ROOT, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      notFound.add(path);
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function launch(profile) {
  if (!existsSync(CHROME)) throw new Error(`no Chrome at ${CHROME}; set CHROME`);
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--remote-debugging-pipe',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] }
  );
  const pending = new Map();
  const events = new Map();
  let id = 0;
  let buffer = '';
  let dead = null;
  const die = (why) => {
    dead = new Error(why);
    for (const { reject } of [...pending.values(), ...events.values()]) reject(dead);
  };
  chrome.on('error', (e) => die(`Chrome failed to start: ${e.message}`));
  chrome.on('exit', () => die('Chrome exited'));
  chrome.stdio[3].on('error', (e) => die(`Chrome pipe: ${e.message}`));
  chrome.stdio[4].on('error', (e) => die(`Chrome pipe: ${e.message}`));
  chrome.stdio[4].on('data', (data) => {
    buffer += data;
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject, method } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(`${method}: ${message.error.message}`));
        else resolve(message.result);
      } else if (events.has(message.method)) {
        events.get(message.method).resolve();
        events.delete(message.method);
      }
    }
  });
  const timed = (work, what) => {
    let timer;
    const limit = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out: ${what}`)), STEP_MS);
    });
    return Promise.race([work, limit]).finally(() => clearTimeout(timer));
  };
  const send = (method, params = {}, sessionId) => {
    if (dead) return Promise.reject(dead);
    const work = new Promise((resolve, reject) => {
      id += 1;
      pending.set(id, { resolve, reject, method });
      chrome.stdio[3].write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
    });
    return timed(work, method);
  };
  const next = (method) =>
    timed(new Promise((resolve, reject) => events.set(method, { resolve, reject })), method);
  return { chrome, send, next };
}

// Runs in the page. scrollWidth is blind here: body clips with overflow-x.
const SWEEP = `(() => {
  const width = document.documentElement.clientWidth;
  const outside = (r) => r.width > 0 && (r.left < -0.5 || r.right > width + 0.5);
  const name = (e) => e.tagName.toLowerCase() + (e.className ? '.' + e.className : '');
  const bad = [...document.body.querySelectorAll('*')]
    .filter((e) => outside(e.getBoundingClientRect()))
    .map(name);
  const range = document.createRange();
  range.selectNodeContents(document.body);
  if ([...range.getClientRects()].some(outside)) bad.push('text');
  const m = document.querySelector('.manifesto');
  const lines = m && Math.round(m.getBoundingClientRect().height / parseFloat(getComputedStyle(m).lineHeight));
  const bridge = document.querySelector('.work-title');
  const action = document.querySelector('.action');
  return {
    bad,
    lines,
    bridgeBottom: bridge && Math.round(bridge.getBoundingClientRect().bottom),
    actionTop: action && Math.round(action.getBoundingClientRect().top + scrollY),
  };
})()`;

// Five points around every verb reach the verb, and its tagline stays clear of it. The rest of
// the row reaches the name on touch and nothing on a mouse, which keeps the tagline selectable.
const TARGETS = `(() => {
  const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const link = (x, y) => document.elementFromPoint(x, y)?.closest('a');
  const centre = (e) => {
    const r = e.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const missed = [];
  for (const row of document.querySelectorAll('.track')) {
    row.scrollIntoView({ block: 'center' });
    const verb = row.querySelector('.track-verb');
    const name = row.querySelector('.track-name a');
    const r = verb.getBoundingClientRect();
    const points = [
      centre(verb),
      [r.left - 8, r.top - 6],
      [r.right + 8, r.top - 6],
      [r.left - 8, r.bottom + 2],
      [r.right + 8, r.bottom + 2],
    ];
    if (points.some(([x, y]) => link(x, y) !== verb)) missed.push('verb ' + name.textContent);
    const expected = coarse ? name : null;
    const cells = ['.track-tagline', '.track-no', '.track-lead'].map((s) => row.querySelector(s));
    if (cells.some((c) => (link(...centre(c)) ?? null) !== expected)) {
      missed.push('row ' + name.textContent);
    }
    const range = document.createRange();
    range.selectNodeContents(row.querySelector('.track-tagline'));
    const line = range.getClientRects()[0];
    if (link(centre(verb)[0], line.top + 2) === verb) missed.push('tagline ' + name.textContent);
  }
  return { coarse, missed };
})()`;

const works = readdirSync(join(ROOT, 'work'), { withFileTypes: true }).filter((e) =>
  e.isDirectory()
);
const pages = ['/', '/404.html', ...works.map((e) => `/work/${e.name}/`)];
const failures = [];
const profile = mkdtempSync(join(tmpdir(), '1mb-layout-'));
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
let chrome;

try {
  const session = launch(profile);
  chrome = session.chrome;
  const { send, next } = session;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const tab = (method, params) => send(method, params, sessionId);
  const read = async (expression) => {
    const { result, exceptionDetails } = await tab('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    if (exceptionDetails) {
      throw new Error(`in the page: ${exceptionDetails.exception?.description}`);
    }
    return result.value;
  };
  await tab('Page.enable');
  await tab('Network.enable');
  await tab('Network.setBypassServiceWorker', { bypass: true });
  await tab('Network.setBlockedURLs', { urls: ['*counter.1mb.dev*'] });
  await tab('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }],
  });

  for (const { width, height, mobile } of SIZES) {
    await tab('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      mobile,
      deviceScaleFactor: 1,
    });
    await tab('Emulation.setTouchEmulationEnabled', { enabled: mobile });
    for (const page of pages) {
      const loaded = next('Page.loadEventFired');
      loaded.catch(() => {}); // Chrome can die before this is awaited; the await still throws.
      await tab('Page.navigate', { url: base + page });
      await loaded;
      const at = `${width} ${page}`;
      if (notFound.has(page)) {
        failures.push(`${at}: not found`);
        continue;
      }
      await tab('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
      const { bad, lines, bridgeBottom, actionTop } = await read(SWEEP);
      if (bad.length) failures.push(`${at}: past the edge: ${[...new Set(bad)].join(', ')}`);
      if (page === '/' && lines !== 1) failures.push(`${at}: manifesto on ${lines} lines`);
      if (page === '/' && width === 1280 && (bridgeBottom === null || bridgeBottom > height)) {
        failures.push(`${at}: bridge below the fold, ${bridgeBottom}`);
      }
      if (page.startsWith('/work/') && actionTop === null) failures.push(`${at}: no action`);
      if (page === '/') {
        const { coarse, missed } = await read(TARGETS);
        if (coarse !== mobile) failures.push(`${at}: pointer is not what this size emulates`);
        if (missed.length) failures.push(`${at}: target missed: ${missed.join(', ')}`);
      }
      if (width === 375 && page.startsWith('/work/')) {
        console.log(
          `${page.padEnd(20)} action at ${actionTop}, ${(actionTop / height).toFixed(2)}`
        );
      }
    }
  }
} catch (error) {
  failures.push(error.message);
} finally {
  server.close();
  // The profile cannot go until Chrome has: it writes on the way out.
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    const gone = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await gone;
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}

for (const failure of failures) console.error(failure);
console.log(failures.length ? `${failures.length} failed` : 'layout ok');
process.exit(failures.length ? 1 : 0);
