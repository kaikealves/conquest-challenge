import { setupServer } from 'msw/node';

import { handlers } from './handlers.ts';

/** The Node entry point, used by Vitest. Shares `handlers` with the browser. */
export const server = setupServer(...handlers);
