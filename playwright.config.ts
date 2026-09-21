import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://localhost:${port}`;
const realPort = 4174;
const realLedgerDir = '.local/e2e-ledger';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // In CI the run is read after the fact, not watched: the github reporter
  // annotates failures on the diff, and the html reporter is what carries
  // the traces the workflow uploads. Locally, streaming output is better.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    // There are no retries, so 'on-first-retry' would never capture
    // anything. A failure in CI is the one case where a trace is worth
    // having, and the workflow uploads it.
    trace: 'retain-on-failure',
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
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${String(port)} --strictPort`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // `real` mode, as `npm run dev:real` runs it, but fed a fixture and kept in
      // its own directory so a test run never touches the author's real output.
      command: `tsx tools/importer/main.ts tools/importer/fixtures/accounts-across-nested-categories.xml ${realLedgerDir}/data && vite --mode real --port ${String(realPort)} --strictPort`,
      url: `http://localhost:${String(realPort)}`,
      env: { REAL_LEDGER_PUBLIC_DIR: realLedgerDir },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
