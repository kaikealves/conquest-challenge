import { readEntries } from '../../features/ledger/import/wcfGeneralLedger.ts';
import { ReportAggregator, type Report } from '../../features/reporting/report.ts';
import type { ReportTemplate } from '../../features/reporting/reportTemplate.ts';
import type { Currency } from '../money.ts';

/**
 * The whole pipeline: Provider payload in, Report out, across both bounded
 * contexts. This is Seam 1 — the one entry point the domain rules are tested
 * through, so the intermediate model stays an implementation detail.
 *
 * It is wiring and nothing else. Translation belongs to Ledger's importer and
 * aggregation to Reporting's aggregator; this file only joins them, which is why
 * it can live in `shared` without owning domain behaviour.
 *
 * Per ADR-0002 it runs at build time, never in the browser, so the general
 * ledger never reaches a client.
 */
export async function buildReportFromProviderPayload(
  payload: AsyncIterable<string>,
  template: ReportTemplate,
  currency: Currency = 'EUR',
): Promise<Report> {
  const aggregator = new ReportAggregator(currency);

  for await (const entry of readEntries(payload)) {
    aggregator.addEntry(entry.account, entry.amount);
  }

  return aggregator.toReport(template);
}
