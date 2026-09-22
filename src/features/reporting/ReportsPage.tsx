import { Link, Navigate, useNavigate, useParams } from 'react-router';

import type { Company } from './api/contract.ts';
import { useCompanies } from './api/useCompanies.ts';
import { useTemplates } from './api/useTemplates.ts';
import { CompanyChooser } from './components/CompanyChooser.tsx';
import { PeriodChooser } from './components/PeriodChooser.tsx';
import { TemplateChooser } from './components/TemplateChooser.tsx';
import { ReportScreen } from './ReportScreen.tsx';

const companyPath = (companyId: string) => `/companies/${encodeURIComponent(companyId)}`;

const templatePath = (companyId: string, templateId: string) =>
  `${companyPath(companyId)}/reports/${encodeURIComponent(templateId)}`;

const reportPath = (companyId: string, templateId: string, period: string) =>
  `${templatePath(companyId, templateId)}/${encodeURIComponent(period)}`;

/** Periods arrive ascending, so the last is the latest. */
const latestOf = (periods: readonly string[]) => periods[periods.length - 1];

/**
 * The page at `/`, `/companies/:companyId`,
 * `/companies/:companyId/reports/:templateId` and
 * `/companies/:companyId/reports/:templateId/:period`. Company, ReportTemplate
 * and Period all live in the URL, in that order, so the address is the whole
 * of what a colleague needs to see the same Report; nothing about any of the
 * three choices is held in memory.
 *
 * An address that names less than a full Report is completed by replacing it
 * — the first Company, then its first ReportTemplate, then that
 * ReportTemplate's latest Period — so Back never lands on an address that
 * only redirects forward again.
 *
 * Choosing a different Company never tries to keep the current ReportTemplate
 * or Period: its chart of accounts can be entirely different, so there is
 * nothing general to keep. See ADR-0010.
 */
export function ReportsPage() {
  const { companyId, templateId, period } = useParams();
  const navigate = useNavigate();
  const companiesQuery = useCompanies();

  if (companiesQuery.isPending) {
    return <p role="status">Loading companies…</p>;
  }

  if (companiesQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>The list of companies could not be loaded.</p>
        <button
          type="button"
          onClick={() => void companiesQuery.refetch()}
          className="rounded border border-slate-300 px-3 py-1 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const { companies } = companiesQuery.data;
  const [firstCompany] = companies;

  if (!firstCompany) {
    return <p>There are no companies to choose from.</p>;
  }

  if (companyId === undefined) {
    return <Navigate to={companyPath(firstCompany.id)} replace />;
  }

  const company = companies.find((candidate) => candidate.id === companyId);

  if (!company) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert">
          There is no company called <strong>{companyId}</strong>. The link may be out of date.
          Choose one that exists:
        </p>
        <ul className="list-disc pl-6">
          {companies.map((candidate) => (
            <li key={candidate.id}>
              <Link to={companyPath(candidate.id)} className="text-slate-900 underline">
                {candidate.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const chooseCompany = (chosenId: string) => {
    void navigate(companyPath(chosenId));
  };

  return (
    <ReportTemplateResolver
      company={company}
      companies={companies}
      onChooseCompany={chooseCompany}
      templateId={templateId}
      period={period}
    />
  );
}

type ReportTemplateResolverProps = {
  readonly company: Company;
  readonly companies: readonly Company[];
  readonly onChooseCompany: (companyId: string) => void;
  readonly templateId: string | undefined;
  readonly period: string | undefined;
};

/**
 * Resolves ReportTemplate and Period for a Company already known to exist.
 * Split from `ReportsPage` because the two are fetched from different
 * endpoints (`useTemplates` needs `company.id`), so a Company must be resolved
 * before this can even ask.
 */
function ReportTemplateResolver({
  company,
  companies,
  onChooseCompany,
  templateId,
  period,
}: ReportTemplateResolverProps) {
  const navigate = useNavigate();
  const { data: index, isPending, isError, refetch } = useTemplates(company.id);

  if (isPending) {
    return (
      <>
        <CompanyChooser companies={companies} selectedId={company.id} onChoose={onChooseCompany} />
        <p role="status">Loading report templates…</p>
      </>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <CompanyChooser companies={companies} selectedId={company.id} onChoose={onChooseCompany} />
        <p>The list of report templates could not be loaded.</p>
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
        <CompanyChooser companies={companies} selectedId={company.id} onChoose={onChooseCompany} />
        <p>This company has no report templates to choose from.</p>
      </>
    );
  }

  if (templateId === undefined) {
    return <Navigate to={templatePath(company.id, first.id)} replace />;
  }

  const template = index.templates.find((candidate) => candidate.id === templateId);

  if (!template) {
    return (
      <div className="flex flex-col gap-3">
        <CompanyChooser companies={companies} selectedId={company.id} onChoose={onChooseCompany} />
        <p role="alert">
          There is no report template called <strong>{templateId}</strong>. The link may be out of
          date. Choose one that exists:
        </p>
        <ul className="list-disc pl-6">
          {index.templates.map((candidate) => (
            <li key={candidate.id}>
              <Link
                to={templatePath(company.id, candidate.id)}
                className="text-slate-900 underline"
              >
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
        <CompanyChooser companies={companies} selectedId={company.id} onChoose={onChooseCompany} />
        <p>This report template has no reports yet.</p>
      </>
    );
  }

  if (period === undefined) {
    return <Navigate to={reportPath(company.id, template.id, latest)} replace />;
  }

  const chooseTemplate = (chosenId: string) => {
    const chosen = index.templates.find((candidate) => candidate.id === chosenId);
    const keep = chosen?.periods.includes(period) ? period : undefined;

    // Keep the Period a user is comparing across when the new ReportTemplate has
    // it; otherwise the bare address, which resolves to the latest.
    void navigate(
      keep === undefined
        ? templatePath(company.id, chosenId)
        : reportPath(company.id, chosenId, keep),
    );
  };

  if (!template.periods.includes(period)) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <CompanyChooser
            companies={companies}
            selectedId={company.id}
            onChoose={onChooseCompany}
          />
          <TemplateChooser
            templates={index.templates}
            selectedId={template.id}
            onChoose={chooseTemplate}
          />
        </div>
        <div className="flex flex-col gap-3">
          <p role="alert">
            There is no {template.name.toLowerCase()} for <strong>{period}</strong>. The link may be
            out of date. Choose one that exists:
          </p>
          <ul className="list-disc pl-6">
            {template.periods.map((candidate) => (
              <li key={candidate}>
                <Link
                  to={reportPath(company.id, template.id, candidate)}
                  className="text-slate-900 underline"
                >
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
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <CompanyChooser companies={companies} selectedId={company.id} onChoose={onChooseCompany} />
        <TemplateChooser
          templates={index.templates}
          selectedId={template.id}
          onChoose={chooseTemplate}
        />
        <PeriodChooser
          periods={template.periods}
          selected={period}
          onChoose={(chosen) => void navigate(reportPath(company.id, template.id, chosen))}
        />
      </div>
      <ReportScreen companyId={company.id} templateId={template.id} period={period} />
    </div>
  );
}
