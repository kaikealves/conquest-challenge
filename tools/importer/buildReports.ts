import { readEntries } from './providers/wcfGeneralLedger.ts';
import type { Currency } from './domain/money.ts';
import { buildReport, totalByAccountAndPeriod, type Report } from './reporting/report.ts';
import type { ReportTemplate } from './reporting/reportTemplate.ts';

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
  currency: Currency = 'EUR',
): Promise<Report[]> {
  const byPeriod = await totalByAccountAndPeriod(readEntries(payload), currency);

  return [...byPeriod.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, totals]) => buildReport(totals, template, period, currency));
}
