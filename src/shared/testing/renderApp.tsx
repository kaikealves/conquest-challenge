import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';

import { App } from '../../App.tsx';

/**
 * Renders the whole application against MSW — the second of the two seams
 * CLAUDE.md names, and the one every user-facing rule is asserted through.
 *
 * Each test gets its own QueryClient so nothing leaks between them, and retries
 * are off: a test for a failing request should fail once, not spend three
 * backoffs doing it.
 */
export function renderApp(): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}
