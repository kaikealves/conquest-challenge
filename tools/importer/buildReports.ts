import { readEntries } from './providers/wcfGeneralLedger.ts';
import type { Currency } from './domain/money.ts';
import {
  buildReport,
  totalByAccountAndPeriod,
  type Company,
  type Report,
} from './reporting/report.ts';
import type { ReportTemplate } from './reporting/reportTemplate.ts';

/** Used when a caller does not say which Company a Report is for — most tests. */
const UNSPECIFIED_COMPANY: Company = {
  id: 'unspecified-company',
  name: 'Unspecified Company',
  country: 'ZZ',
};

/**
 * Seam 1: a Provider payload in, one Report per Period out.
 *
 * This is the entry point the domain rules are tested through, so that the
 * intermediate model stays an implementation detail. It is wiring — translation
 * belongs to the Provider module and aggregation to Reporting.
 */
export async function buildReports(
  payload: AsyncIterable<string>,
  template: ReportTemplate,
  company: Company = UNSPECIFIED_COMPANY,
  currency: Currency = 'EUR',
): Promise<Report[]> {
  const byPeriod = await totalByAccountAndPeriod(readEntries(payload), currency);

  return [...byPeriod.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, totals], index) =>
      buildReport(totals, template, period, currency, company, index > 0),
    );
}
