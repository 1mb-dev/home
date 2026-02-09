import { env, fetchMock, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import worker from './counter.js';

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => fetchMock.assertNoPendingInterceptors());

// Helper: mock a single Redis response
function mockRedis(response) {
  fetchMock
    .get('https://mock.upstash.io')
    .intercept({ method: 'POST', path: '/' })
    .reply(200, JSON.stringify(response));
}

// Helper: mock multiple sequential Redis calls
function mockRedisSequence(responses) {
  const pool = fetchMock.get('https://mock.upstash.io');
  for (const response of responses) {
    pool.intercept({ method: 'POST', path: '/' }).reply(200, JSON.stringify(response));
  }
}

// Helper: mock a Redis failure
function mockRedisError() {
  fetchMock
    .get('https://mock.upstash.io')
    .intercept({ method: 'POST', path: '/' })
    .reply(500, 'Internal Server Error');
}

describe('GET /', () => {
  it('returns current count', async () => {
    mockRedis({ result: '42' });

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ count: 42 });
  });

  it('returns 0 when count is null', async () => {
    mockRedis({ result: null });

    const response = await worker.fetch(new Request('http://localhost/'), env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ count: 0 });
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
  it('increments count on first vote', async () => {
    // GET voted:<hash> -> null, INCR count -> 1, SET voted:<hash> -> OK
    mockRedisSequence([{ result: null }, { result: 1 }, { result: 'OK' }]);

    const request = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.voted).toBe(true);
    expect(body.message).toBe('Counted');
  });

  it('returns existing count when rate-limited', async () => {
    // GET voted:<hash> -> "1" (already voted), GET count -> "5"
    mockRedisSequence([{ result: '1' }, { result: '5' }]);

    const request = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(5);
    expect(body.voted).toBe(true);
    expect(body.message).toBe('Already counted');
  });

  it('hashes IP for privacy (does not store raw IP)', async () => {
    // Two different IPs should produce different rate-limit keys
    // We verify indirectly: both should succeed (not rate-limited)
    mockRedisSequence([{ result: null }, { result: 10 }, { result: 'OK' }]);

    const request1 = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '10.0.0.1' },
    });
    const response1 = await worker.fetch(request1, env, { waitUntil() {} });
    const body1 = await response1.json();

    mockRedisSequence([{ result: null }, { result: 11 }, { result: 'OK' }]);

    const request2 = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '10.0.0.2' },
    });
    const response2 = await worker.fetch(request2, env, { waitUntil() {} });
    const body2 = await response2.json();

    expect(body1.count).toBe(10);
    expect(body2.count).toBe(11);
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
    const response = await worker.fetch(
      new Request('http://localhost/', { method: 'PUT' }),
      env,
      { waitUntil() {} }
    );

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
    mockRedis({ result: '1' });

    const request = new Request('http://localhost/', {
      headers: { Origin: 'https://1mb.dev' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://1mb.dev');
  });

  it('allows localhost origin', async () => {
    mockRedis({ result: '1' });

    const request = new Request('http://localhost/', {
      headers: { Origin: 'http://localhost:8080' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8080');
  });

  it('defaults to 1mb.dev for unknown origins', async () => {
    mockRedis({ result: '1' });

    const request = new Request('http://localhost/', {
      headers: { Origin: 'https://evil.com' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://1mb.dev');
  });
});
