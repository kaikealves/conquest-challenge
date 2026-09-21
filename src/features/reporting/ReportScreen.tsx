import { useReport } from './api/useReport.ts';
import { ReportView } from './components/ReportView.tsx';

/**
 * The Report a user looks at.
 *
 * The ReportTemplate and Period are fixed here. Tickets 14 and 15 put them in
 * the URL so a Report can be bookmarked and shared; until then this is the one
 * Report the mock API serves.
 *
 * Loading and error states are deliberately plain: ticket 12 owns making them
 * good, including retry without a page reload.
 */
const TEMPLATE_ID = 'french-chart';
const PERIOD = '2016';

export function ReportScreen() {
  const { data: report, isPending, isError, error } = useReport(TEMPLATE_ID, PERIOD);

  if (isPending) {
    return (
      <p role="status" className="text-slate-600">
        Loading the Report…
      </p>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="text-red-700">
        {error.message}
      </p>
    );
  }

  return <ReportView report={report} />;
}
