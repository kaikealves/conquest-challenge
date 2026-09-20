import { setupWorker } from 'msw/browser';

import { handlers } from './handlers.ts';

/**
 * The browser entry point, used by the dev server, the production bundle and
 * therefore Playwright. Shares `handlers` with Node.
 */
export const worker = setupWorker(...handlers);
