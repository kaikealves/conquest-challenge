import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/shared/mocks/node.ts';

/**
 * Above Testing Library's 1000ms default. Since ticket 30, opening the
 * application resolves Company, then ReportTemplate, then (where a test
 * navigates deep enough) Report — three sequential fetches before the first
 * `findBy*` in a test can succeed, correct (Company must be known before its
 * ReportTemplates can be asked for) but tight under the CPU contention of the
 * whole suite's many parallel jsdom environments running at once.
 */
configure({ asyncUtilTimeout: 5000 });

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
