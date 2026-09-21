/**
 * A ReportTemplate is data, not code: a second Chart of Accounts is a second
 * template, never a code change. That is what lets one application serve a
 * French chart and a UK chart.
 */

/** An AccountCode prefix that decides whether an Account belongs to a Category. */
export type CategoryRoot = string;

/**
 * The definition of one Category within a ReportTemplate.
 *
 * The glossary has one word, Category, for both this and the computed line in a
 * Report. They are genuinely two things — a rule and its result — so they are
 * named apart here.
 */
export type CategoryDefinition = {
  readonly label: string;
  readonly categoryRoots: readonly CategoryRoot[];
  /**
   * Nested Categories. Every Category in a template competes for an Account on
   * the same terms — the longest matching CategoryRoot wins, then the deeper
   * Category — so a child may claim an Account its parent's own roots would not
   * select, and the parent's total is then everything beneath it, not
   * everything its roots match. The definitions must be distinct objects, as
   * parsed JSON always is: placement is keyed on identity.
   */
  readonly children?: readonly CategoryDefinition[];
};

/**
 * The two kinds of Report, which differ in how they treat a carried-forward
 * balance: a BalanceSheet is a position at the end of a Period, so it includes
 * OpeningBalance Entries; a ProfitAndLoss is what happened during it, so it
 * excludes them and each FiscalYear's Result reflects only that year.
 */
export type ReportKind = 'BalanceSheet' | 'ProfitAndLoss';

/**
 * A Category computed from the ProfitAndLoss Accounts of the same Period rather
 * than read off the chart: the Result, which is what makes a BalanceSheet
 * balance. It has no children and lists the revenue and expense Accounts it is
 * made of, so its total is still the sum of what is beneath it.
 */
export type ResultDefinition = {
  readonly label: string;
  /** The revenue and expense Accounts whose net is the Result. */
  readonly categoryRoots: readonly CategoryRoot[];
};

export type ReportTemplate = {
  /**
   * Stable identifier, used in the URL. Separate from `name` so that renaming a
   * template for display does not break a shared link.
   */
  readonly id: string;
  readonly name: string;
  readonly kind: ReportKind;
  readonly categories: readonly CategoryDefinition[];
  /**
   * Appended after the Categories when present. A BalanceSheet carries one so its
   * Categories net to zero; a ProfitAndLoss has no use for it.
   */
  readonly result?: ResultDefinition;
};
