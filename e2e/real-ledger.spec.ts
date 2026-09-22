import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

/**
 * `npm run dev:real` serves what the importer computed instead of the mock API.
 * This runs the same mode against small purpose-built fixtures (the real
 * ledger is never a test input), on its own dev server — see
 * `playwright.config.ts`. Two Companies are imported, the same shape a real
 * `dev:real` run has after ticket 30: proof the switcher works against the
 * importer's real output, not only against MSW.
 *
 * The mock API answers this application with €2,350.50 for Operating expenses.
 * The French fixture's four expense lines add up to €500.50, so seeing that
 * figure can only mean the importer's files were served.
 */
test.use({ baseURL: 'http://localhost:4174' });

const FRENCH_COMPANY_ID = 'accounts-across-nested-categories';
const UK_COMPANY_ID = 'uk-fixture-co';

test('the importer’s own Reports are what the application shows', async ({ page }) => {
  await page.goto(`/companies/${FRENCH_COMPANY_ID}/reports/french-profit-and-loss`);

  await expect(page.getByRole('row', { name: /Operating expenses/ })).toContainText('€500.50');
  await expect(page.getByRole('combobox', { name: 'Period' })).toHaveValue('2016');
});

test('given no Company name, the importer derives one from the payload’s own filename', async ({
  page,
}) => {
  // Not `/`: `/` also resolves the ReportTemplate and Period, which is not
  // what this test is about, so the Company is named explicitly instead.
  await page.goto(`/companies/${FRENCH_COMPANY_ID}`);

  await expect(page.getByRole('combobox', { name: 'Company' })).toHaveValue(FRENCH_COMPANY_ID);
  await expect(page.getByRole('combobox', { name: 'Company' })).toHaveText(
    /Accounts Across Nested Categories/,
  );
});

test('a Period the importer did not write is a plain not-found, not an error state', async ({
  page,
}) => {
  await page.goto(`/companies/${FRENCH_COMPANY_ID}/reports/french-profit-and-loss/1999`);

  await expect(page.getByRole('alert')).toContainText('1999');
});

test('a file the importer did not write answers 404, not the application shell', async ({
  request,
}) => {
  const response = await request.get(
    `/data/companies/${FRENCH_COMPANY_ID}/reports/french-profit-and-loss/1999.json`,
  );

  expect(response.status()).toBe(404);
  expect(response.headers()['content-type'] ?? '').not.toContain('text/html');
});

test('switching Company shows the second importer run’s genuinely different chart', async ({
  page,
}) => {
  await page.goto(`/companies/${FRENCH_COMPANY_ID}/reports/french-profit-and-loss/2016`);
  await expect(page.getByRole('row', { name: /Operating expenses/ })).toBeVisible();

  await page.getByRole('combobox', { name: 'Company' }).selectOption('UK Fixture Co');

  // The bare address is where the switch navigates to; it resolves further,
  // by the same redirect chain a first visit takes, to this Company's own
  // first ReportTemplate and latest Period.
  await expect(page).toHaveURL(
    new RegExp(`/companies/${UK_COMPANY_ID}/reports/uk-profit-and-loss/2016$`),
  );
  await expect(page.getByRole('row', { name: /Turnover/ })).toBeVisible();
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
