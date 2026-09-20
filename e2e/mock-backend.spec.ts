import { expect, test } from '@playwright/test';

/**
 * Harness verification, not a domain test — the browser counterpart of
 * `src/shared/mocks/handlers.test.ts`, and like it, not a pattern to copy. It
 * calls `fetch` inside the page rather than driving the application, because at
 * ticket 02 nothing rendered fetches anything yet. What it protects is that the
 * built bundle registers the worker and serves the same handler array Vitest
 * uses, which is what ADR-0003 means by the handlers being the API contract.
 *
 * Waiting for the shell is load-bearing, not decorative: a service worker does
 * not control the page the instant navigation resolves, and `main.tsx` renders
 * only once the worker has started. Asserting before the shell appears races
 * registration and gets `index.html` back from the preview server.
 */
test('handlers answer requests in the built application', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Accounting Reports' })).toBeVisible();

  const health = await page.evaluate(async () => {
    const response = await fetch('/api/health');
    return { status: response.status, body: (await response.json()) as unknown };
  });

  expect(health.status).toBe(200);
  expect(health.body).toEqual({ status: 'ok' });
});
