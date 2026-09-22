import { Link, Navigate, useNavigate, useParams } from 'react-router';

import type { Company } from './api/contract.ts';
import { useTemplates } from './api/useTemplates.ts';
import { PeriodChooser } from './components/PeriodChooser.tsx';
import { TemplateChooser } from './components/TemplateChooser.tsx';
import { ReportScreen } from './ReportScreen.tsx';

const templatePath = (templateId: string) => `/reports/${encodeURIComponent(templateId)}`;

const reportPath = (templateId: string, period: string) =>
  `${templatePath(templateId)}/${encodeURIComponent(period)}`;

/** Periods arrive ascending, so the last is the latest. */
const latestOf = (periods: readonly string[]) => periods[periods.length - 1];

/**
 * The page at `/`, `/reports/:templateId` and `/reports/:templateId/:period`.
 * The ReportTemplate and the Period live in the URL, so the address is the whole
 * of what a colleague needs to see the same Report; nothing about the choice is
 * held in memory.
 *
 * An address that names less than a full Report is completed by replacing it —
 * the first ReportTemplate, then that ReportTemplate's latest Period — so Back
 * never lands on an address that only redirects forward again.
 */
export function ReportsPage() {
  const { templateId, period } = useParams();
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
    return (
      <>
        <CompanyHeading company={index.company} />
        <p>There are no ReportTemplates to choose from.</p>
      </>
    );
  }

  if (templateId === undefined) {
    return <Navigate to={templatePath(first.id)} replace />;
  }

  const template = index.templates.find((candidate) => candidate.id === templateId);

  if (!template) {
    return (
      <div className="flex flex-col gap-3">
        <CompanyHeading company={index.company} />
        <p role="alert">
          There is no ReportTemplate called <strong>{templateId}</strong>. The link may be out of
          date. Choose one that exists:
        </p>
        <ul className="list-disc pl-6">
          {index.templates.map((candidate) => (
            <li key={candidate.id}>
              <Link to={templatePath(candidate.id)} className="text-slate-900 underline">
                {candidate.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const latest = latestOf(template.periods);

  if (latest === undefined) {
    return (
      <>
        <CompanyHeading company={index.company} />
        <p>This ReportTemplate has no Reports yet.</p>
      </>
    );
  }

  if (period === undefined) {
    return <Navigate to={reportPath(template.id, latest)} replace />;
  }

  const chooseTemplate = (chosenId: string) => {
    const chosen = index.templates.find((candidate) => candidate.id === chosenId);
    const keep = chosen?.periods.includes(period) ? period : undefined;

    // Keep the Period a user is comparing across when the new ReportTemplate has
    // it; otherwise the bare address, which resolves to the latest.
    void navigate(keep === undefined ? templatePath(chosenId) : reportPath(chosenId, keep));
  };

  if (!template.periods.includes(period)) {
    return (
      <div className="flex flex-col gap-6">
        <CompanyHeading company={index.company} />
        <TemplateChooser
          templates={index.templates}
          selectedId={template.id}
          onChoose={chooseTemplate}
        />
        <div className="flex flex-col gap-3">
          <p role="alert">
            There is no Report for Period <strong>{period}</strong> under {template.name}. The link
            may be out of date. Choose one that exists:
          </p>
          <ul className="list-disc pl-6">
            {template.periods.map((candidate) => (
              <li key={candidate}>
                <Link to={reportPath(template.id, candidate)} className="text-slate-900 underline">
                  {candidate}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CompanyHeading company={index.company} />
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <TemplateChooser
          templates={index.templates}
          selectedId={template.id}
          onChoose={chooseTemplate}
        />
        <PeriodChooser
          periods={template.periods}
          selected={period}
          onChoose={(chosen) => void navigate(reportPath(template.id, chosen))}
        />
      </div>
      <ReportScreen templateId={template.id} period={period} />
    </div>
  );
}

/**
 * Whose data this is, shown as soon as the ReportTemplate index has loaded —
 * before a reader has to work it out from a Report's own heading, or from
 * nothing at all. There is one Company per running instance of this
 * application; see ADR-0009.
 *
 * A heading, not a plain paragraph: it is page-orienting content a reader
 * might jump to directly, the same way `ReportTable`'s own heading is.
 */
function CompanyHeading({ company }: { readonly company: Company }) {
  return <h2 className="text-sm font-medium text-slate-500">{company.name}</h2>;
}
