import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, test } from 'vitest';

import { REPORT_URL_PATTERN } from './api/contract.ts';
import { ReportScreen } from './ReportScreen.tsx';
import { server } from '../../shared/mocks/node.ts';
import { createQueryClient } from '../../shared/queryClient.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * What the application does while it is working, when it fails, and when there
 * is nothing to show.
 *
 * Most of these render the whole application against MSW. Two do not: the
 * Period rule needs the Period to change, which no user can do until ticket 15
 * puts it in the URL, and the deduplication rule needs two views of one Report.
 * Both say so where they are.
 */
const COMPANY_ID = 'northwind-freight';

function renderScreen(templateId: string, period: string) {
  const queryClient = createQueryClient();

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ReportScreen companyId={COMPANY_ID} templateId={templateId} period={period} />
    </QueryClientProvider>,
  );

  return {
    ...result,
    changePeriodTo: (nextPeriod: string) =>
      result.rerender(
        <QueryClientProvider client={queryClient}>
          <ReportScreen companyId={COMPANY_ID} templateId={templateId} period={nextPeriod} />
        </QueryClientProvider>,
      ),
  };
}

function respondWith(status: number, body: Record<string, unknown>) {
  server.use(http.get(REPORT_URL_PATTERN, () => HttpResponse.json(body, { status })));
}

const aReportWith = (categories: unknown[]) => ({
  company: { id: COMPANY_ID, name: 'Test Co', country: 'FR' },
  templateId: 'french-profit-and-loss',
  templateName: 'Profit and loss',
  period: '2016',
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories,
});

afterEach(() => {
  server.events.removeAllListeners();
});

test('a Report in flight says so, and stops saying so once it arrives', async () => {
  // The Report screen alone: rendered through the application, the list of
  // ReportTemplates loads first and the Report's own loading state is not there
  // to observe on the first render.
  renderScreen('french-profit-and-loss', '2016');

  expect(screen.getByText('Loading the report…')).toBeVisible();

  expect(await screen.findByRole('table')).toBeVisible();
  expect(screen.queryByText('Loading the report…')).not.toBeInTheDocument();
});

test('each state is announced to a reader who cannot see the screen', async () => {
  renderScreen('french-profit-and-loss', '2016');

  // One live region, mounted before its content changes, so every transition is
  // announced — including the Report arriving, which nothing else marks.
  const announcement = screen.getByRole('status');

  expect(announcement).toHaveTextContent(/loading/i);
  await screen.findByRole('table');
  expect(announcement).toHaveTextContent(/ready/i);
});

test('a failed request explains itself rather than showing nothing', async () => {
  // A 404 rather than a 500: the retry policy does not ask again for a Report
  // that does not exist, so this is the fast, permanent kind of failure.
  respondWith(404, { message: 'No such Report.' });
  renderApp();

  expect(await screen.findByText(/could not be loaded\. The connection/i)).toBeVisible();
  expect(screen.getByRole('button', { name: /try again/i })).toBeVisible();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('retrying a failed request loads the Report, without reloading the page', async () => {
  // The server is down until the test lets it recover, so the number of
  // automatic retries in the policy cannot change what this proves.
  let recovered = false;

  server.use(
    http.get(REPORT_URL_PATTERN, () =>
      recovered
        ? HttpResponse.json(
            aReportWith([{ label: 'Purchases', total: '10.00', children: [], accounts: [] }]),
          )
        : HttpResponse.json({ message: 'The Report could not be produced.' }, { status: 503 }),
    ),
  );

  renderApp();

  const retry = await screen.findByRole('button', { name: /try again/i }, { timeout: 5000 });

  recovered = true;
  await userEvent.click(retry);

  expect(await screen.findByRole('table')).toBeVisible();
  expect(screen.queryByText(/could not be loaded\. The connection/i)).not.toBeInTheDocument();
});

test('changing the Period never shows the previous Period’s Report', async () => {
  const { changePeriodTo } = renderScreen('french-profit-and-loss', '2016');

  // 2016 and 2015 carry different figures in the fixtures, so the old total is
  // a thing that can be looked for and must not be there.
  await screen.findByText('€2,350.50');

  changePeriodTo('2015');

  // Checked immediately, with no waiting. `waitFor` would retry until the new
  // Report arrived and so would pass even if the old figures were on screen
  // the whole time in between — which is exactly the bug this guards against.
  expect(screen.queryByText('€2,350.50')).not.toBeInTheDocument();
  expect(screen.getByText('Loading the report…')).toBeVisible();

  expect(await screen.findByText('€4,701.00')).toBeVisible();
});

test('a Report with no Categories says so, and is not mistaken for a failure', async () => {
  respondWith(200, aReportWith([]));
  renderApp();

  expect(await screen.findByText(/has no figures for/i)).toBeVisible();
  // The discriminator a user acts on: nothing failed, so there is nothing to
  // retry.
  expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/no figures/i);
});

test('two views of the same Report make one request, not two', async () => {
  // Below the application seam deliberately: no screen shows one Report twice,
  // so the rule cannot be reached through the rendered application. It is here
  // because ticket 12 lists it, not as a pattern to copy.
  const requested: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (/\/data\/companies\/[^/]+\/reports\//.test(request.url)) requested.push(request.url);
  });

  const queryClient = createQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <ReportScreen companyId={COMPANY_ID} templateId="french-profit-and-loss" period="2016" />
      <ReportScreen companyId={COMPANY_ID} templateId="french-profit-and-loss" period="2016" />
    </QueryClientProvider>,
  );

  await screen.findAllByRole('table');

  expect(requested).toHaveLength(1);
});

test('a Report with no Categories but money in the unmatched group is still shown', async () => {
  respondWith(200, {
    ...aReportWith([]),
    unmatched: {
      label: 'Unmatched',
      total: '9.00',
      children: [],
      accounts: [{ code: '999', name: 'Lost', total: '9.00' }],
    },
  });
  renderApp();

  // Nothing to show would hide exactly the money the group exists to surface.
  expect(await screen.findByText(/1 account matches none/)).toBeVisible();
  expect(screen.queryByText(/This report has no figures/)).not.toBeInTheDocument();
});

test('a payload without the unmatched group is a failed load, not a blank page', async () => {
  // `undefined` is left out of JSON, so the field is absent on the wire.
  respondWith(200, { ...aReportWith([]), unmatched: undefined });
  renderApp();

  // An older file left behind next to a newer bundle: the contract says the
  // group is always there, so its absence means the Report cannot be trusted.
  expect(await screen.findByRole('button', { name: /try again/i })).toBeVisible();
});

test('a Report without its Company is a failed load, not a page that pretends nothing is wrong', async () => {
  respondWith(200, { ...aReportWith([]), company: undefined });
  renderApp();

  expect(await screen.findByRole('button', { name: /try again/i })).toBeVisible();
});
