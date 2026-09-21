import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: choosing a ReportTemplate, and opening a link someone else sent.
 * The URL itself is asserted in a real browser (`e2e/`), where there is one.
 */
const chooser = () => screen.findByRole('combobox', { name: 'Report template' });

test('the available ReportTemplates are listed', async () => {
  renderApp();

  const options = (await chooser()).querySelectorAll('option');

  expect([...options].map((option) => option.textContent)).toEqual([
    'French chart of accounts',
    'Balance sheet',
  ]);
});

test('opening the application with no ReportTemplate shows the first one', async () => {
  renderApp();

  expect(await screen.findByRole('row', { name: /Operating expenses/ })).toBeInTheDocument();
  expect(await chooser()).toHaveDisplayValue('French chart of accounts');
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
  renderApp('/reports/balance-sheet');

  expect(await screen.findByRole('row', { name: /Assets/ })).toBeInTheDocument();
  // The chooser agrees with the Report, or the page contradicts itself.
  expect(await chooser()).toHaveDisplayValue('Balance sheet');
});

test('a link to a ReportTemplate that does not exist says so and offers the ones that do', async () => {
  renderApp('/reports/no-such-template');

  expect(await screen.findByText(/no-such-template/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Balance sheet' })).toHaveAttribute(
    'href',
    '/reports/balance-sheet',
  );
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('an address that is no page of the application says so', async () => {
  renderApp('/somewhere/else');

  expect(await screen.findByText(/no page/i)).toBeInTheDocument();
});
