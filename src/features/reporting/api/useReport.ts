import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { reportUrl, type Report } from './contract.ts';

/**
 * Fetches a Report. TanStack Query owns the server state per ADR-0005 — there is
 * no `useEffect` fetching anywhere in this application, so caching, dedup of
 * concurrent requests and the loading and error states come from one place.
 */
export function useReport(templateId: string, period: string): UseQueryResult<Report> {
  return useQuery({
    queryKey: ['report', templateId, period],
    queryFn: async ({ signal }) => {
      const response = await fetch(reportUrl(templateId, period), { signal });

      if (!response.ok) {
        throw new Error(
          `Could not load the Report for ${templateId} in ${period} (${String(response.status)}).`,
        );
      }

      return (await response.json()) as Report;
    },
  });
}
