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
  await page.goto('/');

  await expect(page.getByRole('row', { name: /Operating expenses/ })).toContainText('€500.50');
  await expect(page.getByRole('combobox', { name: 'Period' })).toHaveValue('2016');
});

test('a Period the importer did not write is a plain not-found, not an error state', async ({
  page,
}) => {
  await page.goto('/reports/french-chart/1999');

  await expect(page.getByRole('alert')).toContainText('1999');
});

test('a file the importer did not write answers 404, not the application shell', async ({
  request,
}) => {
  const response = await request.get('/data/reports/french-chart/1999.json');

  expect(response.status()).toBe(404);
  expect(response.headers()['content-type'] ?? '').not.toContain('text/html');
});
