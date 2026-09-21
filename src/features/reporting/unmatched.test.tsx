import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: money no Category claimed is on screen, not lost.
 *
 * The mock's 2015 Report has one Account in the unmatched group and its 2016
 * Report has none, so both cases are reachable from an address.
 */
test('a Report with nothing unmatched still shows the group, empty', async () => {
  renderApp('/reports/french-profit-and-loss/2016');

  expect(await screen.findByRole('row', { name: /Unmatched/ })).toHaveTextContent('€0.00');
  expect(screen.queryByText(/matched none/)).not.toBeInTheDocument();
});

test('a Report with unmatched Accounts says so, with how much', async () => {
  renderApp('/reports/french-profit-and-loss/2015');

  expect(await screen.findByText(/1 Account matched none of this/)).toHaveTextContent('€80.00');
  expect(screen.getByText(/may be incomplete/)).toBeInTheDocument();
});

test('the unmatched Accounts can be opened to see which they are', async () => {
  const user = userEvent.setup();
  renderApp('/reports/french-profit-and-loss/2015');

  await user.click(await screen.findByRole('button', { name: /Unmatched/ }));

  expect(screen.getByRole('row', { name: /471000/ })).toHaveTextContent('Compte d’attente');
});
