import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { REPORT_URL_PATTERN, TEMPLATE_INDEX_URL_PATTERN } from './api/contract.ts';
import { server } from '../../shared/mocks/node.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: choosing a ReportTemplate, and opening a link someone else sent.
 * The URL itself is asserted in a real browser (`e2e/`), where there is one.
 */
const COMPANY_ID = 'northwind-freight';
const BASE = `/companies/${COMPANY_ID}/reports`;
const chooser = () => screen.findByRole('combobox', { name: 'Report template' });
const TEST_COMPANY = { id: COMPANY_ID, name: 'Test Co', country: 'FR' };

test('the available ReportTemplates are listed', async () => {
  renderApp();

  const options = (await chooser()).querySelectorAll('option');

  expect([...options].map((option) => option.textContent)).toEqual([
    'Profit and loss',
    'Balance sheet',
  ]);
});

test('opening the application with no ReportTemplate shows the first one', async () => {
  renderApp();

  expect(await screen.findByRole('row', { name: /Operating expenses/ })).toBeInTheDocument();
  expect(await chooser()).toHaveDisplayValue('Profit and loss');
});

test('choosing another ReportTemplate shows that Report instead', async () => {
  const user = userEvent.setup();
  renderApp();

  await screen.findByRole('row', { name: /Operating expenses/ });
  await user.selectOptions(await chooser(), 'Balance sheet');

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeInTheDocument();
  expect(screen.queryByRole('row', { name: /Operating expenses/ })).not.toBeInTheDocument();
});

test('a shared link shows the Report its sender chose', async () => {
  renderApp(`${BASE}/french-balance-sheet`);

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeInTheDocument();
  // The chooser agrees with the Report, or the page contradicts itself.
  expect(await chooser()).toHaveDisplayValue('Balance sheet');
});

test('a link to a ReportTemplate that does not exist says so and offers the ones that do', async () => {
  renderApp(`${BASE}/no-such-template`);

  expect(await screen.findByText(/no-such-template/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Balance sheet' })).toHaveAttribute(
    'href',
    `${BASE}/french-balance-sheet`,
  );
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('an address that is no page of the application says so', async () => {
  renderApp('/somewhere/else');

  expect(await screen.findByText(/no page/i)).toBeInTheDocument();
});

const indexOf = (templates: unknown[]) =>
  http.get(TEMPLATE_INDEX_URL_PATTERN, () =>
    HttpResponse.json({ company: TEST_COMPANY, templates }),
  );

test('an id that is not path-safe still reaches its own Report', async () => {
  const requested: string[] = [];
  server.events.on('request:start', ({ request }) => {
    requested.push(new URL(request.url).pathname);
  });
  server.use(
    indexOf([{ id: 'a b/c', name: 'Odd id', periods: ['2016'] }]),
    http.get(REPORT_URL_PATTERN, () =>
      HttpResponse.json({
        company: TEST_COMPANY,
        templateId: 'a b/c',
        templateName: 'Odd id',
        period: '2016',
        currency: 'EUR',
        unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
        categories: [{ label: 'Found it', total: '1.00', children: [], accounts: [] }],
      }),
    ),
  );
  renderApp();

  expect(await screen.findByRole('row', { name: /Found it/ })).toBeInTheDocument();
  expect(requested).toContain(`/data/companies/${COMPANY_ID}/reports/a%20b%2Fc/2016.json`);
});

test('a list of ReportTemplates that fails to load can be asked for again', async () => {
  const user = userEvent.setup();
  let recovered = false;
  server.use(
    http.get(TEMPLATE_INDEX_URL_PATTERN, () =>
      recovered
        ? HttpResponse.json({
            company: TEST_COMPANY,
            templates: [{ id: 'french-profit-and-loss', name: 'French', periods: ['2016'] }],
          })
        : HttpResponse.json({ message: 'down' }, { status: 404 }),
    ),
  );
  renderApp();

  const retry = await screen.findByRole('button', { name: /try again/i });
  recovered = true;
  await user.click(retry);

  expect(await screen.findByRole('row', { name: /Operating expenses/ })).toBeInTheDocument();
});

test('no ReportTemplates at all is said plainly', async () => {
  server.use(indexOf([]));
  renderApp();

  expect(await screen.findByText(/no report templates to choose from/)).toBeInTheDocument();
});

test('a ReportTemplate with no Periods says it has no Reports', async () => {
  server.use(indexOf([{ id: 'empty', name: 'Empty', periods: [] }]));
  renderApp();

  expect(await screen.findByText(/no reports yet/)).toBeInTheDocument();
});

test('the latest Period is the one shown when the link names none', async () => {
  server.use(
    indexOf([{ id: 'french-profit-and-loss', name: 'French', periods: ['2015', '2016'] }]),
  );
  renderApp(`${BASE}/french-profit-and-loss`);

  // 2016 is scaled 1x in the mock and 2015 2x, so the total says which loaded.
  expect(await screen.findByRole('row', { name: /Operating expenses/ })).toHaveTextContent(
    '€2,350.50',
  );
});

test('a ReportTemplate index without its Company is a failed load', async () => {
  server.use(
    http.get(TEMPLATE_INDEX_URL_PATTERN, () =>
      HttpResponse.json({ templates: [{ id: 'x', name: 'X', periods: ['2016'] }] }),
    ),
  );
  renderApp();

  expect(await screen.findByRole('button', { name: /try again/i })).toBeVisible();
});
