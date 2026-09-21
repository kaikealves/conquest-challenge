import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { App } from '../../App.tsx';
import { createQueryClient } from '../queryClient.ts';

/**
 * Renders the whole application against MSW — the second of the two seams
 * CLAUDE.md names, and the one every user-facing rule is asserted through.
 *
 * `path` is the URL the user opens, which is how a test says "a colleague sent
 * me this link". Each test gets its own QueryClient so nothing leaks between them.
 */
export function renderApp(path = '/'): RenderResult {
  // The application's own client, so a test exercises the retry policy that
  // ships rather than one invented for the test.
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
