import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: the application rendered against MSW.
 *
 * These assert what a finance user can see, by role and accessible name, never
 * by class name or component internals. The figures come from the handlers in
 * `shared/mocks`, whose Category labels are the ones the real ReportTemplate
 * produces.
 */
test('every Category of the Report is on screen with its total', async () => {
  renderApp();

  const operatingExpenses = await screen.findByRole('row', { name: /Operating expenses/ });

  expect(operatingExpenses).toHaveTextContent('€182,433.83');
  expect(screen.getByRole('row', { name: /Operating income/ })).toBeVisible();
});

test('amounts are formatted with the currency the Report states', async () => {
  renderApp();

  // The Report says EUR, so the symbol and grouping follow from the payload
  // rather than from a hardcoded locale guess.
  expect(await screen.findByText('€182,433.83')).toBeVisible();
});

test('a credit is distinguishable from a debit at a glance', async () => {
  renderApp();

  // Operating income carries a credit balance. Accounting shows a credit in
  // parentheses, so a finance user reads the sign without hunting for a minus.
  const income = await screen.findByRole('row', { name: /Operating income/ });

  expect(income).toHaveTextContent('(€783,315.09)');
});
