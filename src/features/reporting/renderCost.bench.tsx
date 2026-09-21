import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { bench, describe } from 'vitest';

import type { Category, Report } from './api/contract.ts';
import { ReportTable } from './components/ReportTable.tsx';
import { formatAmount } from './formatAmount.ts';

/**
 * The measurements behind docs/adr/0008-memoization-strategy.md. Run with
 * `npm run bench`; the figures in the ADR came from this file.
 *
 * jsdom is slower than a browser in absolute terms, so read the ratios, not the
 * milliseconds.
 */

/** A Report shaped like a large chart: breadth^depth Categories, each leaf with Accounts. */
function largeReport(breadth: number, depth: number, accounts: number): Report {
  const make = (levelsLeft: number, path: string): Category => ({
    label: `Category ${path}`,
    total: '1234.50',
    children:
      levelsLeft === 0
        ? []
        : Array.from({ length: breadth }, (_, i) => make(levelsLeft - 1, `${path}.${String(i)}`)),
    accounts:
      levelsLeft === 0
        ? Array.from({ length: accounts }, (_, i) => ({
            code: `${path}${String(i)}`,
            name: 'Account',
            total: '10.25',
          }))
        : [],
  });

  return {
    templateId: 'large',
    templateName: 'Large',
    period: '2016',
    currency: 'EUR',
    unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
    categories: Array.from({ length: breadth }, (_, i) => make(depth, String(i))),
  };
}

describe('formatting one amount', () => {
  bench('formatAmount', () => {
    formatAmount('1234.50', 'EUR', 'en-GB');
  });
});

describe('an unrelated parent update with the whole tree expanded (5782 rows)', () => {
  let bump: () => void = () => undefined;

  bench(
    'parent re-renders, the Report is unchanged',
    () => {
      act(() => {
        bump();
      });
    },
    {
      iterations: 5,
      warmupIterations: 1,
      setup: async () => {
        const report = largeReport(5, 3, 8);

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

        const user = userEvent.setup();

        for (let pass = 0; pass < 5; pass += 1) {
          for (const button of screen.queryAllByRole('button', { expanded: false })) {
            if (button.textContent !== 'Export to Excel') {
              await user.click(button);
            }
          }
        }
      },
    },
  );
});
