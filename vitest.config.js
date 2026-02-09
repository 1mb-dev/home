import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './workers/wrangler.toml' },
        miniflare: {
          bindings: {
            UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
            UPSTASH_REDIS_REST_TOKEN: 'mock_token_for_testing',
          },
        },
      },
    },
  },
});
