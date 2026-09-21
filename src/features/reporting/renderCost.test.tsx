import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import type { Category, Report } from './api/contract.ts';
import { ReportTable } from './components/ReportTable.tsx';
import * as formatting from './formatAmount.ts';

/**
 * What re-drawing a Report costs, counted rather than timed.
 *
 * Every row draws exactly one amount, so the number of `formatAmount` calls is
 * the number of rows that rendered. Counting that is deterministic where a
 * stopwatch is not; the stopwatch figures are in `renderCost.bench.tsx` and
 * docs/adr/0008-memoization-strategy.md.
 *
 * These render `ReportTable` directly, below the usual seam, because what they
 * assert is about re-rendering and no user can cause an unrelated parent update
 * yet: they need a parent that updates while the Report does not change.
 */
vi.mock('./formatAmount.ts', async (importOriginal) => {
  const original = await importOriginal<typeof formatting>();

  return { ...original, formatAmount: vi.fn(original.formatAmount) };
});

const formatAmount = vi.mocked(formatting.formatAmount);

afterEach(() => {
  vi.restoreAllMocks();
});

const category = (label: string, children: Category[] = [], accountCount = 0): Category => ({
  label,
  total: '10.00',
  children,
  accounts: Array.from({ length: accountCount }, (_, i) => ({
    code: `${label}${String(i)}`,
    name: 'Account',
    total: '1.00',
  })),
});

const report: Report = {
  templateId: 't',
  templateName: 'T',
  period: '2016',
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories: [
    category('Alpha', [category('Alpha one', [], 3), category('Alpha two', [], 3)]),
    category('Beta', [category('Beta one', [], 3)]),
    category('Gamma', [], 3),
  ],
};

function renderWithUpdatableParent() {
  let bump: () => void = () => undefined;

  function Host() {
    const [tick, setTick] = useState(0);

    bump = () => {
      setTick((n) => n + 1);
    };

    return (
      <>
        <span>{tick}</span>
        <ReportTable report={report} />
      </>
    );
  }

  render(<Host />);

  return () => {
    act(() => {
      bump();
    });
  };
}

test('a parent updating while the Report is unchanged does not re-render any row', async () => {
  const user = userEvent.setup();
  const updateParent = renderWithUpdatableParent();

  await user.click(screen.getByRole('button', { name: 'Alpha' }));
  await user.click(screen.getByRole('button', { name: 'Alpha one' }));
  formatAmount.mockClear();

  updateParent();

  // The rows on screen include an expanded Category and its Accounts, and none
  // of them drew again.
  expect(formatAmount).not.toHaveBeenCalled();
});

test('expanding one Category draws it and what it reveals, not its siblings or the rest', async () => {
  const user = userEvent.setup();
  renderWithUpdatableParent();

  await user.click(screen.getByRole('button', { name: 'Alpha' }));
  const rowsBefore = screen.getAllByRole('row').length;
  formatAmount.mockClear();

  await user.click(screen.getByRole('button', { name: 'Beta' }));

  const revealed = screen.getAllByRole('row').length - rowsBefore;

  // The toggled row draws again, and each row it revealed draws once. Alpha and
  // its children, Gamma and Unmatched are not touched.
  expect(revealed).toBeGreaterThan(0);
  expect(formatAmount).toHaveBeenCalledTimes(1 + revealed);
});

test('one amount formatter is built for the currency, not one per row', async () => {
  const construct = vi.spyOn(Intl, 'NumberFormat');
  const user = userEvent.setup();
  renderWithUpdatableParent();

  await user.click(screen.getByRole('button', { name: 'Alpha' }));
  await user.click(screen.getByRole('button', { name: 'Alpha one' }));

  // Some rows are drawn (a dozen or so); building a formatter is what costs, so
  // it must not scale with them. The formatter may already exist from an earlier
  // test in this file, hence "at most".
  expect(screen.getAllByRole('row').length).toBeGreaterThan(8);
  expect(construct.mock.calls.length).toBeLessThanOrEqual(1);
});
