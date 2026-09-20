import { expect, test } from 'vitest';

/**
 * Prior art for the Node half of the MSW setup: the handlers in `handlers.ts`
 * are served to Vitest by `vitest.setup.ts`, so a test can exercise the API
 * contract without a server running. The browser half is covered by
 * `e2e/mock-backend.spec.ts`, against the same array.
 *
 * Handlers declare same-origin paths, so a test must resolve them against the
 * document origin as the application would. An absolute URL to some other host
 * misses the handler and fails as unhandled.
 */
test('the mock backend answers over HTTP in the Node test environment', async () => {
  const response = await fetch(new URL('/api/health', window.location.origin));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: 'ok' });
});
