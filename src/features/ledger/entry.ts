import type { AccountCode } from '../../shared/accountCode.ts';
import type { Money } from '../../shared/money.ts';

/**
 * A single line of accounting data: one Money amount posted to one Account on
 * one date.
 *
 * The amount is signed — a debit is positive, a credit negative — so that a set
 * of Entries balances when its amounts sum to zero. That is the invariant
 * Transaction will own in ticket 05.
 *
 * Transaction itself is deliberately absent. Grouping Entries into Transactions
 * turns out to be a harder problem than it looks against this Provider, and the
 * decision belongs to ticket 05 rather than being pre-empted here; see that
 * ticket for what the payload actually does.
 */
export type Entry = {
  /** The Provider's own stable identifier, so re-running an import is idempotent. */
  readonly id: string;
  readonly account: AccountCode;
  readonly accountName: string;
  readonly amount: Money;
  readonly date: string;
};
