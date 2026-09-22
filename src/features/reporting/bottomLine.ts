import type { Report } from './api/contract.ts';
import { isCredit } from './formatAmount.ts';

/** Whether an exact decimal string is zero, read without converting it to a number. */
function isZero(amount: string): boolean {
  return !/[1-9]/.test(amount);
}

export type BottomLine = {
  readonly label: string;
  readonly amount: string;
  /** For a BalanceSheet, whether it balances; undefined for a ProfitAndLoss. */
  readonly balanced?: boolean;
};

/**
 * What a Report's last line says, shared by the table and the Excel export so
 * the two cannot disagree. A ProfitAndLoss ends on its net result, named for
 * whether it is a profit or a loss; a BalanceSheet ends on the check that its
 * Categories net to zero, which is the brief's "assets = liabilities".
 *
 * Undefined for a payload that predates `kind` and `total`: there is nothing to
 * say, and working the figure out here would be arithmetic the client does not do.
 */
export function bottomLineOf(report: Report): BottomLine | undefined {
  if (report.kind === undefined || report.total === undefined) {
    return undefined;
  }

  if (report.kind === 'BalanceSheet') {
    const balanced = isZero(report.total);

    return {
      label: balanced ? 'Balanced: assets equal equity and liabilities' : 'Out of balance by',
      amount: report.total,
      balanced,
    };
  }

  if (isZero(report.total)) {
    return { label: 'Net result', amount: report.total };
  }

  return {
    label: isCredit(report.total) ? 'Net result (profit)' : 'Net result (loss)',
    amount: report.total,
  };
}
