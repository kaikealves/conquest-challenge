import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { companiesUrl } from './api/contract.ts';
import { server } from '../../shared/mocks/node.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: choosing whose data to look at. The Company is the outermost of the
 * three choices in the URL — see `ReportsPage`'s own doc comment — so these
 * mirror `templateSelection.test.tsx` and `periodSelection.test.tsx`.
 *
 * The mock's second Company (`riverside-textiles`) uses a genuinely different
 * chart of accounts, not just different figures, so a test can tell that
 * switching changed more than a number.
 */
const chooser = () => screen.findByRole('combobox', { name: 'Company' });

test('the Company is shown as soon as the ReportTemplates have loaded', async () => {
  renderApp();

  expect(await chooser()).toHaveDisplayValue('Northwind Freight Cooperative');
});

test('choosing another Company shows its own chart of accounts, not a relabelled one', async () => {
  const user = userEvent.setup();
  renderApp();

  await screen.findByRole('row', { name: /Operating expenses/ });
  await user.selectOptions(await chooser(), 'Riverside Textiles');

  // Riverside's ProfitAndLoss has entirely different Category labels: proof
  // this is a different chart, not the same shape with new numbers.
  expect(await screen.findByRole('row', { name: /Turnover/ })).toBeInTheDocument();
  expect(screen.queryByRole('row', { name: /Operating expenses/ })).not.toBeInTheDocument();
});

test('switching Company does not try to keep the previous ReportTemplate or Period', async () => {
  const user = userEvent.setup();
  renderApp('/companies/northwind-freight/reports/french-balance-sheet/2015');

  await screen.findByRole('row', { name: /Assets/ });
  await user.selectOptions(await chooser(), 'Riverside Textiles');

  // Riverside has no `french-balance-sheet` and no 2015 Period; it lands on
  // its own first ReportTemplate and latest Period instead of failing.
  expect(await screen.findByRole('row', { name: /Turnover/ })).toBeInTheDocument();
  expect(await screen.findByRole('combobox', { name: 'Period' })).toHaveDisplayValue('2016');
});

test('a shared link shows the Company its sender chose', async () => {
  renderApp('/companies/riverside-textiles');

  expect(await screen.findByRole('row', { name: /Turnover/ })).toBeInTheDocument();
  expect(await chooser()).toHaveDisplayValue('Riverside Textiles');
});

test('a link to a Company that does not exist says so and offers the ones that do', async () => {
  renderApp('/companies/no-such-company');

  expect(await screen.findByText(/no-such-company/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Riverside Textiles' })).toHaveAttribute(
    'href',
    '/companies/riverside-textiles',
  );
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('the Company is shown even when the link names no ReportTemplate that exists', async () => {
  renderApp('/companies/northwind-freight/reports/no-such-template');

  expect(await chooser()).toHaveDisplayValue('Northwind Freight Cooperative');
  expect(await screen.findByText(/no ReportTemplate called/)).toBeInTheDocument();
});

test('a list of Companies that fails to load can be asked for again', async () => {
  const user = userEvent.setup();
  let recovered = false;
  server.use(
    http.get(companiesUrl(), () =>
      recovered
        ? HttpResponse.json({
            companies: [{ id: 'acme', name: 'Acme Co', country: 'FR' }],
          })
        : HttpResponse.json({ message: 'down' }, { status: 404 }),
    ),
  );
  renderApp();

  const retry = await screen.findByRole('button', { name: /try again/i });
  recovered = true;
  await user.click(retry);

  expect(await chooser()).toHaveDisplayValue('Acme Co');
});

test('no Companies at all is said plainly', async () => {
  server.use(http.get(companiesUrl(), () => HttpResponse.json({ companies: [] })));
  renderApp();

  expect(await screen.findByText(/no Companies to choose from/)).toBeInTheDocument();
});

test('a Company index without its companies is a failed load', async () => {
  server.use(http.get(companiesUrl(), () => HttpResponse.json({})));
  renderApp();

  expect(await screen.findByRole('button', { name: /try again/i })).toBeVisible();
});
