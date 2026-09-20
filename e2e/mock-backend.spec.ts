import { expect, test } from '@playwright/test';

/**
 * Prior art for the browser half of the MSW setup. The built bundle registers
 * the worker before rendering, so the same handlers Vitest uses are answering
 * requests in the browser too — which is what ADR-0003 means by the handlers
 * being the API contract rather than a test double.
 *
 * Waiting for the shell is load-bearing, not decorative: a service worker does
 * not control the page the instant navigation resolves, and `main.tsx` renders
 * only once the worker has started. Asserting before the shell appears races
 * the registration and gets `index.html` back from the preview server.
 */
test('the mock backend answers over HTTP in the built application', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Accounting Reports' })).toBeVisible();

  const health = await page.evaluate(async () => {
    const response = await fetch('/api/health');
    return { status: response.status, body: (await response.json()) as unknown };
  });

  expect(health.status).toBe(200);
  expect(health.body).toEqual({ status: 'ok' });
});
