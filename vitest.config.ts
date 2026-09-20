import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
      // End-to-end tests are Playwright's; Vitest must not try to run them.
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      css: true,
    },
  }),
);
