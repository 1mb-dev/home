# Counter API

Cloudflare Worker for the 1mb community counter.

## Endpoints

| Method | Path      | Description                                             |
| ------ | --------- | ------------------------------------------------------- |
| GET    | `/`       | Returns `{ count, today }`; `today` resets at 00:00 UTC |
| POST   | `/`       | Increment count (1 per IP per 24h)                      |
| GET    | `/health` | Service health status                                   |

## Setup

### 1. Login to Cloudflare

```bash
npx wrangler login
```

### 2. Set secrets

```bash
npx wrangler secret put UPSTASH_REDIS_REST_URL --config workers/wrangler.toml
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN --config workers/wrangler.toml
```

## Commands

```bash
npm run worker:dev      # local development server
npm run worker:deploy   # deploy to production
npm run worker:tail     # view live logs
```

## Testing

```bash
npm test              # run test suite
npm run test:watch    # run in watch mode
```

Tests use `@cloudflare/vitest-plugin` to run the worker in a local Cloudflare runtime with mocked Redis (a spy on `fetch`).

## CI/CD

Worker deployment is automated via GitHub Actions (`.github/workflows/deploy-worker.yml`): a `v*` release tag or a manual run deploys it. A merge does not. Each run:

1. **Test**: runs `npm test`
2. **Deploy**: runs `wrangler deploy`, in its own job with the token

**Setup:** Add `CLOUDFLARE_API_TOKEN` as a secret on the `production` environment. Create the token at the Cloudflare dashboard with "Workers Scripts: Edit" permission, nothing more.

## Production

- **URL:** https://counter.1mb.dev (a custom domain bound in the dashboard, not in `wrangler.toml`)
- **Health:** https://counter.1mb.dev/health

## Architecture

```
Client (1mb.dev)
    ↓
Cloudflare Worker (counter.js)
    ↓
Upstash Redis (managed)
```

- Rate limiting: 1 vote per IP per 24h (IP is hashed, not stored)
- Offline fallback: the client hides the count line if the API is unavailable
