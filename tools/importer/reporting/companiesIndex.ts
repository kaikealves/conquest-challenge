import type { Company } from './report.ts';

/** What `companies.json` writes: every Company this deployment has data for. */
export type CompaniesIndex = {
  readonly companies: readonly Company[];
};
