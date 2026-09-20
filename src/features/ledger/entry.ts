import type { AccountCode } from '../../shared/accountCode.ts';
import type { Money } from '../../shared/money.ts';

/**
 * A single line of accounting data: one Money amount posted to one Account on
 * one date.
 *
 * The amount is signed rather than a debit/credit pair — a debit is positive, a
 * credit negative — so that a set of Entries balances when its amounts sum to
 * zero, which is the invariant Transaction exists to hold (ticket 05).
 */
export interface Entry {
  /** The Provider's own stable identifier, so re-running an import is idempotent. */
  readonly id: string;
  readonly account: AccountCode;
  readonly accountName: string;
  readonly amount: Money;
  readonly date: string;
  readonly journal: string;
}

/** A set of Entries that balance to zero; the only way Entries may be created. */
export interface Transaction {
  readonly id: string;
  readonly entries: readonly Entry[];
}
