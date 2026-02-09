/**
 * 1mb Counter — Cloudflare Worker
 *
 * Proxies requests to Upstash Redis with rate limiting.
 *
 * Environment variables (set in Cloudflare dashboard):
 *   UPSTASH_REDIS_REST_URL  - Your Upstash REST URL
 *   UPSTASH_REDIS_REST_TOKEN - Your Upstash REST token
 *
 * Endpoints:
 *   GET  /        → Returns { count: number }
 *   POST /        → Increments count (1 per IP per 24h), returns { count, voted }
 *   GET  /health  → Returns service health status
 *
 * Recovery & Backup:
 *   - Counter data stored in Upstash Redis (managed service with automatic backups)
 *   - Key: "count" (integer) - total community count
 *   - Keys: "voted:<ip-hash>" (string, TTL 24h) - rate limiting
 *   - To backup: GET https://your-upstash-url with Authorization header
 *   - To restore: SET count <value> via Upstash console or REST API
 *   - Upstash console: https://console.upstash.com
 *
 * Logging:
 *   - Structured JSON logs for all requests
 *   - View with: npm run worker:tail
 */

// Structured logging helper
function log(level, event, data = {}) {
  const entry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  };
  console.log(JSON.stringify(entry));
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://1mb.dev',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// For local testing, allow localhost
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://1mb.dev', 'http://localhost', 'http://127.0.0.1'];

  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));

  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://1mb.dev',
  };
}

// Hash IP for privacy (we don't store raw IPs)
async function hashIP(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_1mb_salt_2024');
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Upstash Redis REST API helper
async function redis(env, command) {
  const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// GET /: Return current count + daily momentum
async function handleGet(env) {
  const today = new Date().toISOString().slice(0, 10);
  const [count, todayCount] = await redis(env, ['MGET', 'count', `daily:${today}`]);
  const result = { count: parseInt(count) || 0, today: parseInt(todayCount) || 0 };
  log('info', 'count.fetch', { count: result.count, today: result.today });
  return result;
}

// POST /: Increment count (rate limited)
async function handlePost(request, env) {
  // Get client IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await hashIP(ip);
  const rateLimitKey = `voted:${ipHash}`;

  // Check if already voted (within 24h)
  const hasVoted = await redis(env, ['GET', rateLimitKey]);

  const today = new Date().toISOString().slice(0, 10);
  const dailyKey = `daily:${today}`;

  if (hasVoted) {
    const [count, todayCount] = await redis(env, ['MGET', 'count', dailyKey]);
    log('info', 'vote.rate_limited', { count: parseInt(count) || 0 });
    return { count: parseInt(count) || 0, today: parseInt(todayCount) || 0, voted: true, message: 'Already counted' };
  }

  // Increment counter + daily
  const count = await redis(env, ['INCR', 'count']);
  const todayCount = await redis(env, ['INCR', dailyKey]);
  await redis(env, ['EXPIRE', dailyKey, 172800]);

  // Mark IP as voted (expires in 24 hours = 86400 seconds)
  await redis(env, ['SET', rateLimitKey, '1', 'EX', 86400]);

  log('info', 'vote.new', { count: parseInt(count), today: parseInt(todayCount) });
  return { count: parseInt(count), today: parseInt(todayCount), voted: true, message: 'Counted' };
}

// GET /health: Return service health status
async function handleHealth(env) {
  const start = Date.now();

  try {
    // Check Redis connectivity
    await redis(env, ['PING']);
    const latency = Date.now() - start;

    log('info', 'health.ok', { latency_ms: latency });
    return {
      status: 'ok',
      service: '1mb-counter',
      timestamp: new Date().toISOString(),
      backend: 'upstash-redis',
      hosting: 'cloudflare-workers',
      latency_ms: latency,
    };
  } catch (error) {
    log('error', 'health.degraded', { error: 'Redis connection failed' });
    return {
      status: 'degraded',
      service: '1mb-counter',
      timestamp: new Date().toISOString(),
      backend: 'upstash-redis',
      hosting: 'cloudflare-workers',
      error: 'Redis connection failed',
    };
  }
}

// Extract request context for logging
function getRequestContext(request) {
  const cf = request.cf || {};
  return {
    method: request.method,
    path: new URL(request.url).pathname,
    country: cf.country || 'unknown',
    city: cf.city || 'unknown',
    colo: cf.colo || 'unknown',
    ua: request.headers.get('User-Agent')?.slice(0, 50) || 'unknown',
  };
}

export { hashIP };

// Main handler
export default {
  async fetch(request, env, ctx) {
    const start = Date.now();
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);
    const reqCtx = getRequestContext(request);

    // Handle preflight (no logging for OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let result;
      let status = 200;

      // Route: /health
      if (url.pathname === '/health') {
        result = await handleHealth(env);
        status = result.status === 'ok' ? 200 : 503;
        log('info', 'request', { ...reqCtx, status, duration_ms: Date.now() - start });
        return new Response(JSON.stringify(result), {
          status,
          headers: corsHeaders,
        });
      }

      // Route: / (root)
      if (request.method === 'GET') {
        result = await handleGet(env);
      } else if (request.method === 'POST') {
        result = await handlePost(request, env);
      } else {
        log('warn', 'request', { ...reqCtx, status: 405, duration_ms: Date.now() - start });
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: corsHeaders,
        });
      }

      log('info', 'request', { ...reqCtx, status, duration_ms: Date.now() - start });
      const responseHeaders = request.method === 'GET'
        ? { ...corsHeaders, 'Cache-Control': 'public, max-age=60' }
        : corsHeaders;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: responseHeaders,
      });

    } catch (error) {
      log('error', 'request', { ...reqCtx, status: 500, error: error.message, duration_ms: Date.now() - start });
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
