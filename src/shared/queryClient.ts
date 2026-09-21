import { QueryClient } from '@tanstack/react-query';

import { statusOf } from './httpError.ts';

/**
 * The QueryClient the application uses, and the one tests use too.
 *
 * Tests configuring their own client would exercise a different retry policy
 * from the one that ships, so a bug in it would pass every test and appear only
 * to a user.
 *
 * A 4xx is not retried: asking again for a Report that does not exist returns
 * the same 404, and four attempts turn a clear failure into a five-second wait.
 * A 5xx or a dropped connection is retried once — that is the transient case
 * ticket 12's retry story is about.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = statusOf(error);

          if (status !== undefined && status < 500) {
            return false;
          }

          return failureCount < 1;
        },
      },
    },
  });
}
