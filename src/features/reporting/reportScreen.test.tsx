import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: the application rendered against MSW.
 *
 * These assert what a finance user can see, by role and accessible name, never
 * by class name or component internals. Amounts are formatted in a fixed
 * locale, so the expected strings do not depend on the machine running them.
 */
async function reportRows() {
  const table = await screen.findByRole('table');
  // The body only: the header names the columns and the footer holds the
  // bottom line, and neither is a Category.
  const [, body] = within(table).getAllByRole('rowgroup');

  if (!body) {
    throw new Error('The Report has no body.');
  }

  return within(body)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('rowheader')[0]?.textContent ?? '');
}

test('every Category of the Report is on screen, and no others', async () => {
  renderApp();

  // Pinning the whole set, not a sample: asserting two labels would pass while
  // the application silently dropped a third Category.
  expect(await reportRows()).toEqual([
    'Operating expenses',
    'Operating income',
    'Financial',
    'Exceptional',
    'Income tax',
    'Unmatched',
  ]);
});

test('a Category shows the total the Report gives it', async () => {
  renderApp();

  const row = await screen.findByRole('row', { name: /Operating expenses/ });

  expect(row).toHaveTextContent('€2,350.50');
});

test('amounts are formatted with the currency the Report states', async () => {
  renderApp();

  // The Report says EUR, so the symbol and grouping follow the payload rather
  // than a guess made in a component.
  const row = await screen.findByRole('row', { name: /Financial/ });

  expect(row).toHaveTextContent('€375.00');
});

test('a credit is set apart from a debit for a sighted reader', async () => {
  renderApp();

  // Operating income carries a credit balance. Accounting shows a credit in
  // parentheses, so it reads as income rather than as a negative expense.
  const income = await screen.findByRole('row', { name: /Operating income/ });

  expect(income).toHaveTextContent('(€9,125.25)');
});

test('a credit says so for a reader who cannot see parentheses or colour', async () => {
  renderApp();

  // Parentheses are punctuation a screen reader does not announce by default
  // and colour is invisible to it, so neither of the other two signals arrives.
  const income = await screen.findByRole('row', { name: /Operating income/ });
  const expenses = await screen.findByRole('row', { name: /Operating expenses/ });

  expect(income).toHaveAccessibleName(/credit/);
  expect(expenses).toHaveAccessibleName(/debit/);
});
