import { expect, test } from '@playwright/test';

/**
 * Two claims ADR-0007 rests on. Both are about what the built application and
 * its server actually do rather than about our own code, so both are checked
 * against the real thing.
 */

test('a Report that does not exist answers 404, not the application shell', async ({ request }) => {
  const response = await request.get('/data/reports/no-such-template/2016.json');

  expect(response.status()).toBe(404);
  // A single-page server answers unmatched paths with index.html. If that
  // happened here the client would receive a page of HTML and fail while
  // parsing JSON, so the error state would be a parse error rather than a
  // missing Report.
  expect(response.headers()['content-type'] ?? '').not.toContain('text/html');
});

test('an application route still falls back to the shell', async ({ request }) => {
  const response = await request.get('/reports/french-profit-and-loss/2016');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type'] ?? '').toContain('text/html');
});

test('the development mock API is not deployed', async ({ request, page }) => {
  // The worker script is what would let a deployed site mock its own API, and
  // an earlier version of this test only inspected scripts the page had loaded,
  // so it passed while the file was still shipping. Asserting 404 would be wrong
  // — a single-page server answers any unmatched path with the shell — so this
  // asserts what actually matters: whatever comes back is not a service worker.
  const worker = await request.get('/mockServiceWorker.js');

  expect(worker.headers()['content-type'] ?? '').not.toContain('javascript');
  expect(await worker.text()).not.toContain('addEventListener');

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
});
