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

      return (await response.json()) as ReportTemplateIndex;
    },
  });
}
