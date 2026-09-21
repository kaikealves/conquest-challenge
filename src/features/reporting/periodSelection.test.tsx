import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

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
  renderApp('/reports/french-chart/2016');

  const options = (await chooser()).querySelectorAll('option');

  expect([...options].map((option) => option.textContent)).toEqual(['2015', '2016']);
});

test('choosing another Period shows that Period’s Report', async () => {
  const user = userEvent.setup();
  renderApp('/reports/french-chart/2016');

  expect(await expensesRow()).toHaveTextContent('€2,350.50');

  await user.selectOptions(await chooser(), '2015');

  expect(await screen.findByText(/€4,701\.00/)).toBeInTheDocument();
  expect(screen.queryByText(/€2,350\.50/)).not.toBeInTheDocument();
});

test('a link naming a Period shows that Period, not the latest', async () => {
  renderApp('/reports/french-chart/2015');

  expect(await expensesRow()).toHaveTextContent('€4,701.00');
  expect(await chooser()).toHaveDisplayValue('2015');
});

test('a link naming no Period shows the latest', async () => {
  renderApp('/reports/french-chart');

  expect(await expensesRow()).toHaveTextContent('€2,350.50');
  expect(await chooser()).toHaveDisplayValue('2016');
});

test('a Period the ReportTemplate has no Report for is explained, not shown as a failure', async () => {
  renderApp('/reports/french-chart/1999');

  expect(await screen.findByText(/no Report for Period/)).toHaveTextContent('1999');
  expect(screen.queryByText(/could not be loaded/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '2016' })).toHaveAttribute(
    'href',
    '/reports/french-chart/2016',
  );
});

test('changing ReportTemplate keeps the Period when the new one has it', async () => {
  const user = userEvent.setup();
  renderApp('/reports/french-chart/2016');

  await expensesRow();
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Report template' }),
    'Balance sheet',
  );

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeInTheDocument();
  expect(await chooser()).toHaveDisplayValue('2016');
});

test('changing ReportTemplate falls back to the latest Period when the new one lacks it', async () => {
  const user = userEvent.setup();
  renderApp('/reports/french-chart/2015');

  await expensesRow();
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Report template' }),
    'Balance sheet',
  );

  // The balance sheet exists for 2016 only.
  expect(await screen.findByRole('row', { name: /Assets/ })).toBeInTheDocument();
  expect(await chooser()).toHaveDisplayValue('2016');
});
