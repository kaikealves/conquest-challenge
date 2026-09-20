import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  /**
   * End-to-end tests run against the production bundle, not the dev server, so
   * they exercise what actually ships — including the MSW worker served from
   * `public/`.
   *
   * `reuseExistingServer` stays false even locally. Reusing whatever already
   * answers on this port would skip the build and quietly test a stale `dist/`,
   * which defeats the point of building first.
   */
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
