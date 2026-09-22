import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { REPORT_URL_PATTERN, type Report } from './api/contract.ts';
import { server } from '../../shared/mocks/node.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: a Report ends on its bottom line. The figure comes from the server;
 * the application only names it.
 */
const footerRow = () => screen.findByRole('row', { name: /Net result|balance/i });

test('a ProfitAndLoss ends on its net result, named a profit when it is one', async () => {
  renderApp('/companies/northwind-freight/reports/french-profit-and-loss/2016');

  const row = await footerRow();

  expect(row).toHaveTextContent('Net result (profit)');
  expect(row).toHaveTextContent('(€6,389.75)');
});

test('a BalanceSheet ends on the check that assets equal liabilities', async () => {
  renderApp('/companies/northwind-freight/reports/french-balance-sheet/2016');

  expect(await footerRow()).toHaveTextContent('Balanced: assets equal equity and liabilities');
});

const aReport = (fields: Partial<Report>): Report => ({
  company: { id: 'northwind-freight', name: 'Test Co', country: 'FR' },
  templateId: 'french-balance-sheet',
  templateName: 'Balance sheet',
  period: '2016',
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories: [{ label: 'Assets', total: '10.00', children: [], accounts: [] }],
  ...fields,
});

function serve(report: Report) {
  server.use(http.get(REPORT_URL_PATTERN, () => HttpResponse.json(report)));
}

test('a BalanceSheet that does not balance says by how much', async () => {
  serve(aReport({ kind: 'BalanceSheet', total: '10.00' }));
  renderApp();

  const row = await footerRow();

  expect(row).toHaveTextContent('Out of balance by');
  expect(row).toHaveTextContent('€10.00');
});

test('a ProfitAndLoss in deficit is named a loss', async () => {
  serve(aReport({ kind: 'ProfitAndLoss', total: '10.00' }));
  renderApp();

  expect(await footerRow()).toHaveTextContent('Net result (loss)');
});

test('a payload from before the bottom line existed shows none, rather than guessing one', async () => {
  serve(aReport({}));
  renderApp();

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeVisible();
  expect(screen.queryByRole('row', { name: /Net result|balance/i })).not.toBeInTheDocument();
});
