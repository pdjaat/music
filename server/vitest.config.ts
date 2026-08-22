import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATA_DIR: './data-test',
      RATE_LIMIT_MAX: '50',
      RATE_LIMIT_WINDOW_MS: '60000',
    },
    server: {
      deps: {
        external: [/^node:/],
      },
    },
  },
});
