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
 *   GET /data/companies.json
 *     200 → CompaniesIndex
 *
 *   GET /data/companies/{companyId}/templates.json
 *     200 → ReportTemplateIndex
 *     404 → no such Company
 *
 *   GET /data/companies/{companyId}/reports/{templateId}/{period}.json
 *     200 → Report
 *     404 → no such Company, no such ReportTemplate, or no Report for that Period
 *     500 → the Report could not be produced
 *
 * Every amount is an exact decimal string, never a number. JSON has no exact
 * decimal type and a double loses cents past 2^53 minor units, which the sample
 * ledger is well within but a thirty-year ledger is not. The application does no
 * arithmetic on them; the Excel export converts at the cell boundary, because a
 * spreadsheet cell must hold a number rather than text.
 */

/**
 * The accounting entity a Report belongs to. Carried through unchanged from
 * wherever the data was imported from; the application never reinterprets it.
 * See ADR-0009 and ADR-0010.
 */
export type Company = {
  /** Stable identifier used in the URL. Never the display name. */
  readonly id: string;
  readonly name: string;
  /** ISO 3166-1 alpha-2. Decides which ReportTemplates apply to this Company. */
  readonly country: string;
};

export type CompaniesIndex = {
  readonly companies: readonly Company[];
};

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

/** What a Report is, which decides what its bottom line means. */
export type ReportKind = 'BalanceSheet' | 'ProfitAndLoss';

export type Report = {
  readonly company: Company;
  /** Absent from a payload written before the field existed. */
  readonly kind?: ReportKind;
  /**
   * The Accounts no Category claimed, so an incomplete ReportTemplate is a figure
   * and not a silent loss. Always present, and empty when the template covers
   * everything. Shaped as a Category, with no children.
   */
  readonly unmatched: Category;
  /** Stable identifier used in the URL. Never the display name. */
  readonly templateId: string;
  readonly templateName: string;
  readonly period: string;
  /** ISO 4217. */
  readonly currency: string;
  readonly categories: readonly Category[];
  /**
   * Exact decimal: the net of every top-level Category and `unmatched`. A
   * ProfitAndLoss's net result, a profit being a credit; zero for a BalanceSheet
   * that balances. Sent by the server so the client does no arithmetic. Absent
   * from a payload written before the field existed, and then not shown.
   */
  readonly total?: string;
  /**
   * True when this is a BalanceSheet for a Period that carried no balances
   * forward from an earlier one, so its figures are that year's movements
   * rather than balances. A client says so rather than presenting them as a
   * position. Absent from a payload written before the field existed, which is
   * read as false: it predates the check, and its figures are no worse for it.
   */
  readonly missingOpeningBalances?: boolean;
};

export type ReportTemplateSummary = {
  readonly id: string;
  readonly name: string;
  /** The Periods this ReportTemplate has a Report for, ascending. */
  readonly periods: readonly string[];
};

export type ReportTemplateIndex = {
  readonly company: Company;
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

export function companiesUrl(): string {
  return `${API_BASE_URL}/companies.json`;
}

function companyPath(companyId: string): string {
  return `${API_BASE_URL}/companies/${encodeURIComponent(companyId)}`;
}

export function templateIndexUrl(companyId: string): string {
  return `${companyPath(companyId)}/templates.json`;
}

export function reportUrl(companyId: string, templateId: string, period: string): string {
  // Encoded, so an id or Period can never change which path is requested.
  return `${companyPath(companyId)}/reports/${encodeURIComponent(templateId)}/${encodeURIComponent(period)}.json`;
}

/**
 * The same address with its segments left open, in the syntax MSW matches on.
 * Kept beside `templateIndexUrl`/`reportUrl` so the mock cannot describe a
 * different path from the one the client requests.
 */
export const TEMPLATE_INDEX_URL_PATTERN = `${API_BASE_URL}/companies/:companyId/templates.json`;
export const REPORT_URL_PATTERN = `${API_BASE_URL}/companies/:companyId/reports/:templateId/:period.json`;
