import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './workers/wrangler.toml' },
      miniflare: {
        bindings: {
          UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
          UPSTASH_REDIS_REST_TOKEN: 'mock_token_for_testing',
        },
      },
    }),
  ],
});
