import type { Company } from './report.ts';

/**
 * What `templates.json` writes: which ReportTemplates exist, the Periods each
 * has a Report for, and the Company they all belong to.
 *
 * Kept apart from `ReportTemplate` (the input a template is defined by) the same
 * way `Report` is kept apart from `ReportTemplate`: this is an output shape, not
 * a definition.
 */
export type ReportTemplateSummary = {
  readonly id: string;
  readonly name: string;
  readonly periods: readonly string[];
};

export type ReportTemplateIndex = {
  readonly company: Company;
  readonly templates: readonly ReportTemplateSummary[];
};
