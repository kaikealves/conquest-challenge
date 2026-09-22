import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { REPORT_URL_PATTERN, type Report } from './api/contract.ts';
import { server } from '../../shared/mocks/node.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: a BalanceSheet that carried nothing forward is not presented as a
 * position. The importer decides whether one did; the application only says so.
 */
const aBalanceSheet = (missingOpeningBalances?: boolean): Report => ({
  company: { id: 'northwind-freight', name: 'Test Co', country: 'FR' },
  templateId: 'french-balance-sheet',
  templateName: 'Balance sheet',
  period: '2016',
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories: [{ label: 'Assets', total: '100.00', children: [], accounts: [] }],
  ...(missingOpeningBalances === undefined ? {} : { missingOpeningBalances }),
});

function serve(report: Report) {
  server.use(http.get(REPORT_URL_PATTERN, () => HttpResponse.json(report)));
}

test('a BalanceSheet missing its opening balances says its figures are movements only', async () => {
  serve(aBalanceSheet(true));
  renderApp();

  expect(await screen.findByText(/No balances were carried forward into 2016/)).toBeVisible();
  // The figures are still shown: they are right for what they are.
  expect(screen.getByRole('row', { name: /Assets/ })).toHaveTextContent('€100.00');
});

test('a BalanceSheet with its opening balances carries no such warning', async () => {
  serve(aBalanceSheet(false));
  renderApp();

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeVisible();
  expect(screen.queryByText(/carried forward/)).not.toBeInTheDocument();
});

test('a payload from before the check existed is read as not missing them', async () => {
  serve(aBalanceSheet());
  renderApp();

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeVisible();
  expect(screen.queryByText(/carried forward/)).not.toBeInTheDocument();
});
