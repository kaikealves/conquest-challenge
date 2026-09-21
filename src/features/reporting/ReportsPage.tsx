import { Link, Navigate, useNavigate, useParams } from 'react-router';

import { useTemplates } from './api/useTemplates.ts';
import { TemplateChooser } from './components/TemplateChooser.tsx';
import { ReportScreen } from './ReportScreen.tsx';

const reportPath = (templateId: string) => `/reports/${encodeURIComponent(templateId)}`;

/**
 * The page at `/` and `/reports/:templateId`. The ReportTemplate lives in the
 * URL, so the address is the whole of what a colleague needs to see the same
 * Report; nothing about the choice is held in memory.
 *
 * Until Period selection arrives (ticket 15) the Period is the latest one the
 * ReportTemplate has a Report for.
 */
export function ReportsPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { data: index, isPending, isError, refetch } = useTemplates();

  if (isPending) {
    return <p role="status">Loading the ReportTemplates…</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>The list of ReportTemplates could not be loaded.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded border border-slate-300 px-3 py-1 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const [first] = index.templates;

  if (!first) {
    return <p>There are no ReportTemplates to choose from.</p>;
  }

  if (templateId === undefined) {
    return <Navigate to={reportPath(first.id)} replace />;
  }

  const template = index.templates.find((candidate) => candidate.id === templateId);

  if (!template) {
    return (
      <div className="flex flex-col gap-3">
        <p>
          There is no ReportTemplate called <strong>{templateId}</strong>. The link may be out of
          date. Choose one that exists:
        </p>
        <ul className="list-disc pl-6">
          {index.templates.map((candidate) => (
            <li key={candidate.id}>
              <Link to={reportPath(candidate.id)} className="text-slate-900 underline">
                {candidate.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Periods arrive ascending, so the last is the latest.
  const period = template.periods[template.periods.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <TemplateChooser
        templates={index.templates}
        selectedId={template.id}
        onChoose={(chosen) => void navigate(reportPath(chosen))}
      />
      {period === undefined ? (
        <p>This ReportTemplate has no Reports yet.</p>
      ) : (
        <ReportScreen templateId={template.id} period={period} />
      )}
    </div>
  );
}
