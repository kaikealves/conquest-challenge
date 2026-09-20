import { readTransactions } from '../../features/ledger/import/wcfGeneralLedger.ts';
import { buildReport, type AccountTotal, type Report } from '../../features/reporting/report.ts';
import type { ReportTemplate } from '../../features/reporting/reportTemplate.ts';
import { AccountCode } from '../accountCode.ts';
import { add, zero, type Currency, type Money } from '../money.ts';

/**
 * The whole pipeline: Provider payload in, Report out, across both bounded
 * contexts. This is Seam 1 — the one entry point the domain rules are tested
 * through, so that the intermediate model stays an implementation detail.
 *
 * It lives in `shared` because it belongs to neither context; it is the
 * composition of the two. Per ADR-0002 it runs at build time, never in the
 * browser, so the general ledger never reaches a client.
 *
 * Entries are folded into per-Account totals as Transactions arrive rather than
 * collected first, so memory stays proportional to the Chart of Accounts rather
 * than to the number of Entries.
 */
export async function buildReportFromProviderPayload(
  payload: AsyncIterable<string>,
  template: ReportTemplate,
  currency: Currency = 'EUR',
): Promise<Report> {
  const totals = new Map<string, Money>();

  for await (const transaction of readTransactions(payload)) {
    for (const entry of transaction.entries) {
      const key = entry.account.value;

      totals.set(key, add(totals.get(key) ?? zero(currency), entry.amount));
    }
  }

  const accounts: AccountTotal[] = [...totals].map(([code, total]) => ({
    account: AccountCode.of(code),
    total,
  }));

  return buildReport(accounts, template, currency);
}
