import { expect, test } from '@playwright/test';

/**
 * Two claims ADR-0007 rests on, both about what the built application and its
 * server actually do rather than about our own code, and so both worth checking
 * against the real thing.
 */

test('a Report that does not exist answers 404, not the application shell', async ({ request }) => {
  const response = await request.get('/data/reports/no-such-template/2016.json');

  expect(response.status()).toBe(404);
  // A single-page server answers unmatched paths with index.html. If that
  // happened here the client would receive a page of HTML and fail while
  // parsing JSON, and the error state would be a parse error rather than a
  // missing Report.
  expect(response.headers()['content-type'] ?? '').not.toContain('text/html');
});

test('the production bundle does not carry the development mock API', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (response) => {
    if (response.url().endsWith('.js')) scripts.push(response.url());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Accounting Reports' })).toBeVisible();

  const sources = await Promise.all(
    scripts.map(async (url) => (await page.request.get(url)).text()),
  );

  expect(sources).not.toHaveLength(0);
  expect(sources.some((source) => source.includes('setupWorker'))).toBe(false);
  expect(sources.some((source) => source.includes('mockServiceWorker'))).toBe(false);
});
