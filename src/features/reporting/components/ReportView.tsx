import type { Report } from '../api/contract.ts';
import { CategoryRow } from './CategoryRow.tsx';

type ReportViewProps = {
  readonly report: Report;
};

/**
 * A Report: its Categories and their totals.
 *
 * Categories are rendered flat here. Ticket 13 makes them expandable to
 * arbitrary depth, which is why `CategoryRow` takes a Category rather than a
 * label and a total — the recursion has somewhere to go.
 */
export function ReportView({ report }: ReportViewProps) {
  return (
    <section aria-labelledby="report-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="report-heading" className="text-xl font-semibold text-slate-900">
          {report.templateName}
        </h2>
        <p className="text-sm text-slate-600">
          Period {report.period} · amounts in {report.currency} · credits in parentheses
        </p>
      </div>

      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Categories of the {report.templateName} for Period {report.period}
        </caption>
        <thead>
          <tr className="border-b border-slate-300">
            <th scope="col" className="py-2 pr-4 text-left font-medium text-slate-600">
              Category
            </th>
            <th scope="col" className="py-2 text-right font-medium text-slate-600">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {report.categories.map((category) => (
            <CategoryRow key={category.label} category={category} currency={report.currency} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
