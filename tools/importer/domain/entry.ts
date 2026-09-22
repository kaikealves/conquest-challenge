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
  /**
   * The Account this Entry was posted to. It may be an AuxiliaryAccount — one
   * customer's or one supplier's own — in which case `controlAccount` says where
   * it rolls up.
   */
  readonly account: AccountCode;
  /** Set when `account` is an AuxiliaryAccount: the Chart of Accounts Account above it. */
  readonly controlAccount?: AccountCode;
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

/**
 * The Account a Report sees this Entry under: its ControlAccount when it was
 * posted to an AuxiliaryAccount, otherwise the Account it was posted to. This is
 * the translation between the Ledger and Reporting contexts, and the only place
 * it happens, so an AuxiliaryAccount cannot reach a Report by another route.
 */
export function reportedAccount(entry: Entry): AccountCode {
  return entry.controlAccount ?? entry.account;
}

/**
 * The name to show beside `reportedAccount`. An AuxiliaryAccount's name is one
 * customer's or supplier's, which must not label the ControlAccount above it,
 * and the Provider does not send the ControlAccount's own name — so it is blank
 * rather than wrong. Reporting fills a blank one from the national chart's
 * standard names; see `reporting/standardAccountNames.ts`.
 */
export function reportedAccountName(entry: Entry): string {
  return entry.controlAccount === undefined ? entry.accountName : '';
}
