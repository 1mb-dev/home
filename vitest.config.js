import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
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
        test: { name: 'worker', include: ['workers/**/*.test.js'] },
      },
      {
        test: { name: 'gen', include: ['scripts/**/*.test.js'], environment: 'node' },
      },
    ],
  },
});
