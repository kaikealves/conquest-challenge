import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

/**
 * `npm run dev:real` serves what the importer computed instead of the mock API.
 * This runs the same mode against a small purpose-built fixture (the real ledger
 * is never a test input), on its own dev server — see `playwright.config.ts`.
 *
 * The mock API answers this application with €2,350.50 for Operating expenses.
 * The fixture's four expense lines add up to €500.50, so seeing that figure can
 * only mean the importer's files were served.
 */
test.use({ baseURL: 'http://localhost:4174' });

test('the importer’s own Reports are what the application shows', async ({ page }) => {
  // Not `/`: the importer now also writes a `french-balance-sheet` template,
  // which sorts before this one alphabetically and would be what `/` redirects
  // to, so the ReportTemplate this test is about is named explicitly.
  await page.goto('/reports/french-profit-and-loss');

  await expect(page.getByRole('row', { name: /Operating expenses/ })).toContainText('€500.50');
  await expect(page.getByRole('combobox', { name: 'Period' })).toHaveValue('2016');
});

test('a Period the importer did not write is a plain not-found, not an error state', async ({
  page,
}) => {
  await page.goto('/reports/french-profit-and-loss/1999');

  await expect(page.getByRole('alert')).toContainText('1999');
});

test('a file the importer did not write answers 404, not the application shell', async ({
  request,
}) => {
  const response = await request.get('/data/reports/french-profit-and-loss/1999.json');

  expect(response.status()).toBe(404);
  expect(response.headers()['content-type'] ?? '').not.toContain('text/html');
});

test('a mock service worker left by an earlier `npm run dev` is removed', async ({ page }) => {
  // Stand-in for MSW's worker: any registered worker on this origin is what
  // would keep answering `/data/`, so any registered worker must be removed.
  // A service worker script is fetched outside what Playwright can intercept,
  // so it is a real file in the directory this dev server serves.
  await writeFile('.local/e2e-ledger/stale-worker.js', '');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.register('/stale-worker.js'));
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    )
    .toBe(1);

  await page.reload();

  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    )
    .toBe(0);
});

test('a production build cannot be made in real mode', async () => {
  // Real mode serves the real ledger from the public directory, which a build
  // copies into dist/. It must refuse rather than ship it.
  await expect(
    promisify(execFile)('npx', ['vite', 'build', '--mode', 'real', '--outDir', '.local/refused']),
  ).rejects.toMatchObject({ stderr: expect.stringContaining('local development only') });
});
