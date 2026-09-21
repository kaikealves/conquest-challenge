/**
 * The API contract, from the client's side.
 *
 * These types are what the application expects to receive. They are deliberately
 * not shared with the importer that produces them: a client and a server agree
 * on a payload, not on a module, and a real backend written in Kotlin could not
 * import a TypeScript type anyway. `contract.test.ts` runs the importer over a
 * fixture and checks its output against these types, which is what keeps the two
 * from drifting.
 *
 * Per ADR-0007 these URLs are static JSON in production and MSW handlers in
 * tests and development. Swapping in a real backend is a base-URL change.
 *
 * `docs/api-contract.md` is the same contract written language-neutrally, with
 * the rules a backend must satisfy — that document is for the backend author,
 * this file is for the client.
 *
 *   GET /data/templates.json
 *     200 → ReportTemplateIndex
 *
 *   GET /data/reports/{templateId}/{period}.json
 *     200 → Report
 *     404 → no such ReportTemplate, or no Report for that Period
 *     500 → the Report could not be produced
 *
 * Every amount is an exact decimal string, never a number. JSON has no exact
 * decimal type and a double loses cents past 2^53 minor units, which the sample
 * ledger is well within but a thirty-year ledger is not. The application does no
 * arithmetic on them; the Excel export converts at the cell boundary, because a
 * spreadsheet cell must hold a number rather than text.
 */

export type Account = {
  /** The AccountCode. Variable length; never padded or parsed as a number. */
  readonly code: string;
  readonly name: string;
  /** Exact decimal. A debit is positive, a credit negative. */
  readonly total: string;
};

export type Category = {
  readonly label: string;
  /** Exact decimal: this Category's own Accounts plus every child's total. */
  readonly total: string;
  readonly children: readonly Category[];
  /**
   * The Accounts held directly by this Category — matched by it and by no child,
   * so an Account appears exactly once in the tree and no amount is shown twice.
   */
  readonly accounts: readonly Account[];
};

export type Report = {
  /** Stable identifier used in the URL. Never the display name. */
  readonly templateId: string;
  readonly templateName: string;
  readonly period: string;
  /** ISO 4217. */
  readonly currency: string;
  readonly categories: readonly Category[];
};

export type ReportTemplateSummary = {
  readonly id: string;
  readonly name: string;
  /** The Periods this ReportTemplate has a Report for, ascending. */
  readonly periods: readonly string[];
};

export type ReportTemplateIndex = {
  readonly templates: readonly ReportTemplateSummary[];
};

/** Returned with a 4xx or 5xx, so a client can say what went wrong. */
export type ApiError = {
  readonly message: string;
};

/**
 * The one place the API's location is written down. A real backend is this
 * string changing, which is the whole of ADR-0007's "drop-in, not a rewrite".
 */
export const API_BASE_URL = '/data';

export function templateIndexUrl(): string {
  return `${API_BASE_URL}/templates.json`;
}

export function reportUrl(templateId: string, period: string): string {
  return `${API_BASE_URL}/reports/${templateId}/${period}.json`;
}
