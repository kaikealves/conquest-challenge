import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { templateIndexUrl } from './api/contract.ts';
import { server } from '../../shared/mocks/node.ts';
import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: choosing a Period, and opening a link that names one. The address bar
 * itself is asserted in a real browser (`e2e/`).
 *
 * The mock scales every figure by 2 for 2015, so a total says which Period
 * loaded.
 */
const chooser = () => screen.findByRole('combobox', { name: 'Period' });
const expensesRow = () => screen.findByRole('row', { name: /Operating expenses/ });

test('the Periods a ReportTemplate has are listed, earliest first', async () => {
  renderApp('/reports/french-profit-and-loss/2016');

  const options = (await chooser()).querySelectorAll('option');

  expect([...options].map((option) => option.textContent)).toEqual(['2015', '2016']);
});

test('choosing another Period shows that Period’s Report', async () => {
  const user = userEvent.setup();
  renderApp('/reports/french-profit-and-loss/2016');

  expect(await expensesRow()).toHaveTextContent('€2,350.50');

  await user.selectOptions(await chooser(), '2015');

  expect(await screen.findByText(/€4,701\.00/)).toBeInTheDocument();
  expect(screen.queryByText(/€2,350\.50/)).not.toBeInTheDocument();
});

test('a link naming a Period shows that Period, not the latest', async () => {
  renderApp('/reports/french-profit-and-loss/2015');

  expect(await expensesRow()).toHaveTextContent('€4,701.00');
  expect(await chooser()).toHaveDisplayValue('2015');
});

test('a link naming no Period shows the latest', async () => {
  renderApp('/reports/french-profit-and-loss');

  expect(await expensesRow()).toHaveTextContent('€2,350.50');
  expect(await chooser()).toHaveDisplayValue('2016');
});

test('a Period the ReportTemplate has no Report for is explained, not shown as a failure', async () => {
  renderApp('/reports/french-profit-and-loss/1999');

  expect(await screen.findByText(/no Report for Period/)).toHaveTextContent('1999');
  expect(screen.queryByText(/could not be loaded/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '2016' })).toHaveAttribute(
    'href',
    '/reports/french-profit-and-loss/2016',
  );
});

test('changing ReportTemplate keeps the Period, even when it is not the latest', async () => {
  const user = userEvent.setup();
  // Both ReportTemplates have 2015 and 2016, and the user is on 2015: if the
  // Period were dropped, the fallback would land on 2016 and this would show.
  renderApp('/reports/french-profit-and-loss/2015');

  await expensesRow();
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Report template' }),
    'Balance sheet',
  );

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeInTheDocument();
  expect(await chooser()).toHaveDisplayValue('2015');
});

test('changing ReportTemplate falls back to the latest Period when the new one lacks it', async () => {
  const user = userEvent.setup();
  server.use(
    http.get(templateIndexUrl(), () =>
      HttpResponse.json({
        templates: [
          { id: 'french-profit-and-loss', name: 'Profit and loss', periods: ['2015', '2016'] },
          { id: 'french-balance-sheet', name: 'Balance sheet', periods: ['2016'] },
        ],
      }),
    ),
  );
  renderApp('/reports/french-profit-and-loss/2015');

  await expensesRow();
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Report template' }),
    'Balance sheet',
  );

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeInTheDocument();
  expect(await chooser()).toHaveDisplayValue('2016');
});
