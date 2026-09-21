import type { AccountCode } from './accountCode.ts';
import type { Money } from './money.ts';

/**
 * A single line of accounting data: one Money amount posted to one Account on
 * one date.
 *
 * The amount is signed — a debit is positive, a credit negative — so a balanced
 * set of Entries sums to zero.
 *
 * Transaction is not modelled. This Provider sorts its payload by Account, so
 * one Transaction's Entries are scattered across the document; see ticket 05 and
 * the Ledger glossary.
 */
export type Entry = {
  /** The Provider's own stable identifier, so re-running an import is idempotent. */
  readonly id: string;
  readonly account: AccountCode;
  readonly accountName: string;
  readonly amount: Money;
  readonly date: string;
  /**
   * Whether this Entry carries a balance-sheet Account forward into a new
   * FiscalYear rather than recording something that happened in it. Decided
   * where the Provider's payload is translated, because how a Provider marks
   * one is the Provider's business.
   */
  readonly openingBalance: boolean;
};
