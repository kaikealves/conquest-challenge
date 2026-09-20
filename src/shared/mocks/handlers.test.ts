import { expect, test } from 'vitest';

/**
 * Harness verification, not a domain test — and deliberately not the pattern
 * later tickets should copy.
 *
 * CLAUDE.md puts the two real seams at the pipeline and at the application
 * rendered against MSW, and spec.md asks that a test be named for the domain
 * rule it protects. This test reaches past both: it calls `fetch` directly,
 * because at ticket 02 there is no pipeline and nothing yet renders that
 * fetches. What it protects is the wiring — that `node.ts` really does serve
 * the shared handler array to Vitest. From ticket 11 onward, assert through the
 * rendered application instead.
 *
 * Handlers declare same-origin paths, so a caller must resolve them against the
 * document origin as the application would. An absolute URL to another host
 * misses the handler and fails as unhandled.
 */
test('handlers answer requests in the Node test environment', async () => {
  const response = await fetch(new URL('/api/health', window.location.origin));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: 'ok' });
});
