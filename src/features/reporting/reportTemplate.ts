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
 * named apart here; the gap is worth resolving in the Reporting glossary.
 */
export type CategoryDefinition = {
  readonly label: string;
  readonly categoryRoots: readonly CategoryRoot[];
};

/** An ordered set of Categories defining the shape of a Report. */
export type ReportTemplate = {
  readonly name: string;
  readonly categories: readonly CategoryDefinition[];
};
