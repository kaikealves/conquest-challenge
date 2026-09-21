import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, test } from 'vitest';

import { reportUrl } from './api/contract.ts';
import { ReportScreen } from './ReportScreen.tsx';
import { server } from '../../shared/mocks/node.ts';
import { createQueryClient } from '../../shared/queryClient.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * What the application does while it is working, when it fails, and when there
 * is nothing to show. Asserted through the rendered application against MSW.
 */
function renderScreen(templateId: string, period: string) {
  const queryClient = createQueryClient();

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ReportScreen templateId={templateId} period={period} />
    </QueryClientProvider>,
  );

  return {
    ...result,
    showing: (nextPeriod: string) =>
      result.rerender(
        <QueryClientProvider client={queryClient}>
          <ReportScreen templateId={templateId} period={nextPeriod} />
        </QueryClientProvider>,
      ),
  };
}

function respondWith(status: number, body: Record<string, unknown>) {
  server.use(
    http.get(reportUrl(':templateId', ':period'), () => HttpResponse.json(body, { status })),
  );
}

afterEach(() => {
  server.events.removeAllListeners();
});

test('a Report in flight says so, and stops saying so once it arrives', async () => {
  renderApp();

  expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

  expect(await screen.findByRole('table')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('a failed request explains itself rather than showing nothing', async () => {
  // A 404 rather than a 500: the retry policy does not ask again for a Report
  // that does not exist, so this is the fast, permanent kind of failure.
  respondWith(404, { message: 'No such Report.' });
  renderApp();

  const alert = await screen.findByRole('alert');

  expect(alert).toBeVisible();
  expect(alert.textContent?.trim()).not.toBe('');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('retrying a failed request loads the Report, without reloading the page', async () => {
  // The server is down for the first request and the one automatic retry that
  // follows it, then recovers — so the user sees the failure and their own
  // retry is what fixes it.
  let attempts = 0;

  server.use(
    http.get(reportUrl(':templateId', ':period'), () => {
      attempts += 1;

      return attempts <= 2
        ? HttpResponse.json({ message: 'The Report could not be produced.' }, { status: 500 })
        : HttpResponse.json({
            templateId: 'french-chart',
            templateName: 'French chart of accounts',
            period: '2016',
            currency: 'EUR',
            categories: [{ label: 'Purchases', total: '10.00', children: [], accounts: [] }],
          });
    }),
  );

  renderApp();
  // Longer than the default: the automatic retry happens before the user is
  // told anything.
  await screen.findByRole('alert', {}, { timeout: 5000 });

  await userEvent.click(screen.getByRole('button', { name: /try again/i }));

  expect(await screen.findByRole('table')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('changing the Period never shows the previous Period’s Report', async () => {
  const { showing } = renderScreen('french-chart', '2016');

  // 2016 and 2015 carry different figures in the fixtures, so the old total is
  // a thing that can be looked for and must not be there.
  await screen.findByText('€2,350.50');

  showing('2015');

  // Checked immediately, with no waiting. `waitFor` would retry until the new
  // Report arrived and so would pass even if the old figures were on screen
  // the whole time in between — which is exactly the bug this guards against.
  expect(screen.queryByText('€2,350.50')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeVisible();

  expect(await screen.findByText('€4,701.00')).toBeVisible();
});

test('a Report with no Categories says so, and is not mistaken for a failure', async () => {
  respondWith(200, {
    templateId: 'french-chart',
    templateName: 'French chart of accounts',
    period: '2016',
    currency: 'EUR',
    categories: [],
  });
  renderApp();

  expect(await screen.findByText(/no categories/i)).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('two views of the same Report make one request, not two', async () => {
  const requested: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.url.includes('/data/reports/')) requested.push(request.url);
  });

  const queryClient = createQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <ReportScreen templateId="french-chart" period="2016" />
      <ReportScreen templateId="french-chart" period="2016" />
    </QueryClientProvider>,
  );

  await screen.findAllByRole('table');

  expect(requested).toHaveLength(1);
});
