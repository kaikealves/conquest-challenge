import { useReport } from './api/useReport.ts';
import { ReportTable } from './components/ReportTable.tsx';

type ReportScreenProps = {
  readonly templateId: string;
  readonly period: string;
};

/**
 * The Report a user looks at, and what they see while it is not there yet.
 *
 * Four outcomes, kept apart because a user acts differently on each: still
 * working, failed and worth retrying, arrived but empty, arrived with figures.
 *
 * The ReportTemplate and Period arrive as props. Tickets 14 and 15 put them in
 * the URL so a Report can be bookmarked and shared; `App` passes constants
 * until then.
 */
export function ReportScreen({ templateId, period }: ReportScreenProps) {
  const { data: report, isPending, isError, error, refetch } = useReport(templateId, period);

  return (
    <>
      <StateAnnouncement isPending={isPending} isError={isError} report={report} />
      <ReportState
        isPending={isPending}
        isError={isError}
        error={error}
        report={report}
        onRetry={() => void refetch()}
      />
    </>
  );
}

type StateProps = {
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly report: ReturnType<typeof useReport>['data'];
};

/**
 * One live region, always mounted, whose text changes as the state does.
 *
 * A live region inserted into the page with its content already inside it is
 * commonly missed — assistive technology watches a region it already knows
 * about for changes. Mounting this empty and then filling it is what makes each
 * transition announced, including the one nothing else marks: the Report
 * arriving.
 */
function StateAnnouncement({ isPending, isError, report }: StateProps) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {describeState({ isPending, isError, report })}
    </p>
  );
}

function describeState({ isPending, isError, report }: StateProps): string {
  if (isPending) return 'Loading the Report.';
  if (isError) return 'The Report could not be loaded.';
  if (report && report.categories.length === 0) return 'This Report has no Categories.';

  return 'The Report is ready.';
}

type ReportStateProps = StateProps & {
  readonly error: unknown;
  readonly onRetry: () => void;
};

function ReportState({ isPending, isError, error, report, onRetry }: ReportStateProps) {
  if (isPending) {
    // The announcement is made by the live region above, so this carries no
    // role of its own — two regions would announce the same transition twice.
    return <p className="text-slate-600">Loading the Report…</p>;
  }

  if (isError) {
    // The API's message is for a developer reading a network tab, per
    // docs/api-contract.md, so it goes to the console rather than the screen.
    console.error('The Report could not be loaded.', error);

    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-red-700">
          The Report could not be loaded. The connection may have dropped, or the Report may not
          exist for this Period.
        </p>
        {/* Outside any live region: an alert that contains a button announces
            the button as flat text and re-announces everything when its label
            changes. */}
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Try again
        </button>
      </div>
    );
  }

  if (report && report.categories.length === 0) {
    // Only what is known. An empty Report can mean a Period with no postings or
    // a ReportTemplate whose CategoryRoots match nothing — the payload does not
    // say which, so neither does this.
    return (
      <p className="text-slate-600">This Report has no Categories for Period {report.period}.</p>
    );
  }

  return report ? <ReportTable report={report} /> : null;
}
