import { useId } from 'react';

import type { Report } from '../api/contract.ts';
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
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div>
        <h2 id={headingId} className="text-xl font-semibold text-slate-900">
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
          {report.categories.map((category, position) => (
            // The contract does not promise a Category label is unique, so the
            // key carries its position as well.
            <CategoryRow
              key={`${String(position)}-${category.label}`}
              category={category}
              currency={report.currency}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}
