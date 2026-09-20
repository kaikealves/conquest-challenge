import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/mocks/node.ts';

/**
 * Every component test runs against the same handlers the browser uses, per
 * ADR-0003. `onUnhandledRequest: 'error'` is deliberate: in a test, a request
 * nobody mocked is a mistake worth failing on, not something to let through.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
