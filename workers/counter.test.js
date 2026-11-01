import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import worker, { hashIP } from './counter.js';

// Queued Redis replies, consumed in order. Any fetch that is not a POST to the
// mock Upstash URL, or that arrives with the queue empty, throws (no network).
let pending = [];

beforeEach(() => {
  pending = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    if (method !== 'POST' || new URL(url).origin !== 'https://mock.upstash.io') {
      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }
    if (pending.length === 0) throw new Error(`No mocked Redis reply left for ${url}`);
    return pending.shift()();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  expect(pending, 'unconsumed Redis replies').toHaveLength(0);
});

// Helper: mock a single Redis response
function mockRedis(response) {
  pending.push(() => new Response(JSON.stringify(response), { status: 200 }));
}

// Helper: mock multiple sequential Redis calls
function mockRedisSequence(responses) {
  for (const response of responses) mockRedis(response);
}

// Helper: mock a Redis failure
function mockRedisError() {
  pending.push(() => new Response('Internal Server Error', { status: 500 }));
}

describe('GET /', () => {
  it('returns current count and daily momentum', async () => {
    mockRedis({ result: ['42', '5'] });

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ count: 42, today: 5 });
  });

  it('returns 0 when count and daily are null', async () => {
    mockRedis({ result: [null, null] });

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ count: 0, today: 0 });
  });

  it('returns count with today=0 when daily key is null', async () => {
    mockRedis({ result: ['42', null] });

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ count: 42, today: 0 });
  });

  it('returns Cache-Control and Vary headers', async () => {
    mockRedis({ result: ['1', '0'] });

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('returns 500 on Redis failure', async () => {
    mockRedisError();

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Internal error' });
  });
});

describe('POST /', () => {
  it('increments count and daily on first vote', async () => {
    // SET voted:<hash> NX -> OK, INCR count -> 1, INCR daily -> 1, EXPIRE daily -> 1
    mockRedisSequence([{ result: 'OK' }, { result: 1 }, { result: 1 }, { result: 1 }]);

    const request = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.today).toBe(1);
    expect(body.voted).toBe(true);
    expect(body.message).toBe('Counted');
    expect(response.headers.get('Cache-Control')).toBeNull();
  });

  it('returns existing count when rate-limited', async () => {
    // SET voted:<hash> NX -> null (already voted), MGET count + daily -> ["5", "2"]
    mockRedisSequence([{ result: null }, { result: ['5', '2'] }]);

    const request = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(5);
    expect(body.today).toBe(2);
    expect(body.voted).toBe(true);
    expect(body.message).toBe('Already counted');
  });

  it('claims the vote atomically before counting', async () => {
    mockRedisSequence([{ result: 'OK' }, { result: 1 }, { result: 1 }, { result: 1 }]);

    const request = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    await worker.fetch(request, env, { waitUntil() {} });

    const commands = globalThis.fetch.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(commands[0]).toEqual(['SET', expect.stringMatching(/^voted:/), '1', 'NX', 'EX', 86400]);
    expect(commands[1]).toEqual(['INCR', 'count']);
  });

  it('counts one vote from parallel requests by one IP', async () => {
    let voted = false;
    let count = 0;
    globalThis.fetch.mockImplementation(async (_url, init) => {
      const args = JSON.parse(init.body);
      const [command] = args;
      let result = null;
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (command === 'GET') {
        result = voted ? '1' : null;
      } else if (command === 'SET') {
        result = args.includes('NX') && voted ? null : 'OK';
        voted = true;
      } else if (command === 'INCR') {
        count += 1;
        result = count;
      } else if (command === 'MGET') {
        result = [String(count), '1'];
      } else {
        result = 1;
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    });

    const post = () =>
      worker.fetch(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'CF-Connecting-IP': '1.2.3.4' },
        }),
        env,
        { waitUntil() {} }
      );
    await Promise.all(Array.from({ length: 20 }, post));

    // One vote is two INCRs: the total and the day.
    expect(count).toBe(2);
  });

  it('hashes an IP to a stable 16-hex digest', async () => {
    const hash = await hashIP('10.0.0.1');

    // Hash is a 16-char hex string (8 bytes), not the raw IP
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toContain('10.0.0.1');

    // Different IPs produce different hashes
    const hash2 = await hashIP('10.0.0.2');
    expect(hash2).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toBe(hash2);

    // Same IP produces same hash (deterministic)
    const hash3 = await hashIP('10.0.0.1');
    expect(hash).toBe(hash3);
  });
});

describe('against a store', () => {
  function fakeRedis() {
    const store = new Map();
    const ttl = new Map();
    const auth = [];
    globalThis.fetch.mockImplementation(async (_url, init) => {
      auth.push(init.headers.Authorization);
      const [command, ...args] = JSON.parse(init.body);
      let result = null;
      if (command === 'SET' && !store.has(args[0])) {
        store.set(args[0], args[1]);
        ttl.set(args[0], args[args.indexOf('EX') + 1]);
        result = 'OK';
      } else if (command === 'INCR') {
        result = Number(store.get(args[0]) ?? 0) + 1;
        store.set(args[0], String(result));
      } else if (command === 'EXPIRE') {
        ttl.set(args[0], args[1]);
        result = 1;
      } else if (command === 'MGET') {
        result = args.map((key) => store.get(key) ?? null);
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    });
    return { store, ttl, auth };
  }

  const vote = (ip) =>
    worker.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'CF-Connecting-IP': ip },
      }),
      env,
      { waitUntil() {} }
    );

  it('counts two visitors as two, expires only the day, stores no raw IP', async () => {
    const { store, ttl, auth } = fakeRedis();

    await vote('1.2.3.4');
    await vote('5.6.7.8');
    await vote('1.2.3.4');

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });
    expect(await response.json()).toEqual({ count: 2, today: 2 });

    const dailyKey = `daily:${new Date().toISOString().slice(0, 10)}`;
    expect(ttl.get(dailyKey)).toBe(172800);
    expect(ttl.has('count')).toBe(false);
    expect([...store.keys()].join()).not.toContain('1.2.3.4');
    expect(new Set(auth)).toEqual(new Set([`Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`]));
  });

  it('still counts the vote when EXPIRE fails', async () => {
    mockRedisSequence([{ result: 'OK' }, { result: 1 }, { result: 1 }, { error: 'ERR expire' }]);
    const logged = vi.spyOn(console, 'log');

    const response = await vote('1.2.3.4');

    expect(response.status).toBe(200);
    expect((await response.json()).message).toBe('Counted');
    expect(logged.mock.calls.some(([line]) => line.includes('expire.failed'))).toBe(true);
  });

  it('reports degraded health on an Upstash error body', async () => {
    mockRedis({ error: 'WRONGPASS' });

    const response = await worker.fetch(new Request('http://localhost/health'), env, {
      waitUntil() {},
    });

    expect(response.status).toBe(503);
  });
});

describe('a hung Redis', () => {
  it('passes a timeout signal on every call', async () => {
    mockRedis({ result: ['1', '0'] });

    await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });

    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('answers 500 when the timeout fires', async () => {
    globalThis.fetch.mockImplementation(async () => {
      throw new DOMException('The operation timed out', 'TimeoutError');
    });

    const response = await worker.fetch(new Request('http://localhost/'), env, {
      waitUntil() {},
    });

    expect(response.status).toBe(500);
  });
});

describe('GET /health', () => {
  it('returns ok on PING success', async () => {
    mockRedis({ result: 'PONG' });

    const response = await worker.fetch(new Request('http://localhost/health'), env, {
      waitUntil() {},
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('1mb-counter');
    expect(body).toHaveProperty('latency_ms');
  });

  it('returns 503 on Redis failure', async () => {
    mockRedisError();

    const response = await worker.fetch(new Request('http://localhost/health'), env, {
      waitUntil() {},
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
  });
});

describe('OPTIONS /', () => {
  it('returns 200 with CORS headers and empty body', async () => {
    const request = new Request('http://localhost/', {
      method: 'OPTIONS',
      headers: { Origin: 'https://1mb.dev' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://1mb.dev');
    expect(await response.text()).toBe('');
  });
});

describe('Unsupported methods', () => {
  it('PUT returns 405', async () => {
    const response = await worker.fetch(new Request('http://localhost/', { method: 'PUT' }), env, {
      waitUntil() {},
    });

    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body).toEqual({ error: 'Method not allowed' });
  });

  it('DELETE returns 405', async () => {
    const response = await worker.fetch(
      new Request('http://localhost/', { method: 'DELETE' }),
      env,
      { waitUntil() {} }
    );

    expect(response.status).toBe(405);
  });
});

describe('CORS', () => {
  it('allows 1mb.dev origin', async () => {
    mockRedis({ result: ['1', '0'] });

    const request = new Request('http://localhost/', {
      headers: { Origin: 'https://1mb.dev' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://1mb.dev');
  });

  it('allows localhost origin', async () => {
    mockRedis({ result: ['1', '0'] });

    const request = new Request('http://localhost/', {
      headers: { Origin: 'http://localhost:8080' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8080');
  });

  it('allows 127.0.0.1 with a port', async () => {
    mockRedis({ result: ['1', '0'] });

    const request = new Request('http://localhost/', {
      headers: { Origin: 'http://127.0.0.1:8788' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:8788');
  });

  it.each([
    'https://1mb.dev.evil.example',
    'https://1mb.dev:8443',
    'http://localhost.evil.example',
    'http://localhost:8000.evil.example',
    'http://127.0.0.1.evil.example',
  ])('does not reflect the lookalike %s', async (origin) => {
    mockRedis({ result: ['1', '0'] });

    const request = new Request('http://localhost/', { headers: { Origin: origin } });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://1mb.dev');
  });

  it('defaults to 1mb.dev for unknown origins', async () => {
    mockRedis({ result: ['1', '0'] });

    const request = new Request('http://localhost/', {
      headers: { Origin: 'https://evil.com' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://1mb.dev');
  });
});
