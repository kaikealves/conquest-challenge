import { useId } from 'react';

import type { Report } from '../api/contract.ts';
import { DISPLAY_LOCALE } from '../displayLocale.ts';
import { formatAmount } from '../formatAmount.ts';
import { ExportButton } from './ExportButton.tsx';
import { CategoryRow } from './CategoryRow.tsx';

type ReportTableProps = {
  readonly report: Report;
};

/**
 * A Report: its Categories and their totals.
 *
 * Named for the shape it draws rather than for the Report itself, because the
 * Reporting glossary lists "view" among the words to avoid for a Report.
 *
 * Categories expand to arbitrary depth; `CategoryRow` recurses on itself.
 */
export function ReportTable({ report }: ReportTableProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4">
        <div>
          <h2 id={headingId} className="text-lg font-semibold tracking-tight text-slate-900">
            {report.templateName}
          </h2>
          <p className="text-sm text-slate-500">
            Period {report.period} · amounts in {report.currency} · credits in parentheses
          </p>
        </div>
        {/* Keyed by what it exports, so a failure shown for one Report is not still
            on screen after the user moves to another. */}
        <ExportButton key={`${report.templateId}/${report.period}`} report={report} />
      </div>

      <div className="flex flex-col gap-3 px-5 pt-4 empty:hidden">
        <OpeningBalancesNotice report={report} />
        <UnmatchedNotice report={report} />
      </div>

      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Categories of the {report.templateName} for Period {report.period}
          </caption>
          <thead>
            <tr className="border-b border-slate-200">
              <th
                scope="col"
                className="py-2 pr-4 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
              >
                Category
              </th>
              <th
                scope="col"
                className="py-2 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {report.categories.map((category, position) => (
              // The contract does not promise a Category label is unique, so the
              // key carries its position as well.
              <CategoryRow
                key={`${String(position)}-${category.label}`}
                category={category}
                currency={report.currency}
              />
            ))}
            {/* Always drawn, empty or not: a group that appeared only when it had
                something in it would make its absence mean nothing. */}
            <CategoryRow category={report.unmatched} currency={report.currency} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Warns that a BalanceSheet's figures are one year's movements, not balances,
 * because nothing was carried forward into its Period.
 */
function OpeningBalancesNotice({ report }: { readonly report: Report }) {
  if (!report.missingOpeningBalances) {
    return null;
  }

  return (
    <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      No balances were carried forward into {report.period}, so these figures show only what was
      posted during {report.period}, not the position at the end of it. The ledger may have been
      exported before the previous year was closed.
    </p>
  );
}

/** Says what an incomplete ReportTemplate is costing, in words, above the figures. */
function UnmatchedNotice({ report }: { readonly report: Report }) {
  const count = report.unmatched.accounts.length;

  if (count === 0) {
    return null;
  }

  return (
    <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {count === 1 ? '1 account matches' : `${String(count)} accounts match`} none of this
      template’s categories, totalling{' '}
      {formatAmount(report.unmatched.total, report.currency, DISPLAY_LOCALE)}. The template may be
      incomplete.
    </p>
  );
}
