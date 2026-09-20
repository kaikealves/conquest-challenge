/**
 * A ReportTemplate is data, not code: a second Chart of Accounts is a second
 * template, never a code change. That is what lets one application serve a
 * French chart and a UK chart.
 */

/** An AccountCode prefix that decides whether an Account belongs to a Category. */
export type CategoryRoot = string;

/** One labelled line of a Report, holding every Account matched by its CategoryRoots. */
export interface CategoryDefinition {
  readonly label: string;
  readonly roots: readonly CategoryRoot[];
}

/** An ordered set of Categories defining the shape of a Report. */
export interface ReportTemplate {
  readonly name: string;
  readonly categories: readonly CategoryDefinition[];
}
