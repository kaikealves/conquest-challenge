import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { httpError } from '../../../shared/httpError.ts';
import { templateIndexUrl, type ReportTemplateIndex } from './contract.ts';

/** The ReportTemplates a user can choose between, and the Periods each has Reports for. */
export function useTemplates(): UseQueryResult<ReportTemplateIndex> {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async ({ signal }) => {
      const response = await fetch(templateIndexUrl(), { signal });

      if (!response.ok) {
        throw httpError(
          `Could not load the list of ReportTemplates (${String(response.status)}).`,
          response.status,
        );
      }

      const index = (await response.json()) as Partial<ReportTemplateIndex>;

      // The contract says `company` is always present. Without it this is an
      // older file, from before the index said whose ReportTemplates these are.
      if (index.company === undefined) {
        throw httpError('The ReportTemplate index is missing its Company.', response.status);
      }

      return index as ReportTemplateIndex;
    },
  });
}
