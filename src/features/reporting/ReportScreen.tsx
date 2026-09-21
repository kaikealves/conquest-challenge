import { useReport } from './api/useReport.ts';
import { ReportTable } from './components/ReportTable.tsx';

type ReportScreenProps = {
  readonly templateId: string;
  readonly period: string;
};

/**
 * The Report a user looks at, and what they see while it is not there yet.
 *
 * Four outcomes, kept distinct because a user acts differently on each: still
 * working, failed and worth retrying, arrived but empty, arrived with figures.
 * Collapsing empty into failure would have someone chasing an outage that is
 * really a Period with no postings.
 *
 * The ReportTemplate and Period arrive as props. Tickets 14 and 15 put them in
 * the URL so a Report can be bookmarked and shared; `App` passes constants
 * until then.
 */
export function ReportScreen({ templateId, period }: ReportScreenProps) {
  const { data: report, isPending, isError, refetch, isFetching } = useReport(templateId, period);

  if (isPending) {
    return (
      <p role="status" className="text-slate-600">
        Loading the Report…
      </p>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-red-700">
          The Report could not be loaded. The connection may have dropped, or the Report may not
          exist for this Period.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
        >
          {isFetching ? 'Trying…' : 'Try again'}
        </button>
      </div>
    );
  }

  if (report.categories.length === 0) {
    // Not an error: the request succeeded and the answer is that there is
    // nothing here. Saying so plainly stops someone chasing an outage.
    return (
      <p className="text-slate-600">
        This Report has no Categories for Period {report.period}. Nothing was posted to the Accounts
        this ReportTemplate covers.
      </p>
    );
  }

  return <ReportTable report={report} />;
}
