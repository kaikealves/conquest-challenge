import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { httpError } from '../../../shared/httpError.ts';
import { reportUrl, type ApiError, type Report } from './contract.ts';

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
        // The status travels with the error so the retry policy can tell a
        // missing Report from a server that briefly fell over.
        const body = (await response.json().catch(() => undefined)) as ApiError | undefined;

        throw httpError(
          body?.message ??
            `Could not load the Report for ${templateId} in ${period} (${String(response.status)}).`,
          response.status,
        );
      }

      const report = (await response.json()) as Partial<Report>;

      // The contract says `unmatched` is always present. Without it this is an
      // older file, and a Report that never accounted for what it left out must
      // not be shown as if it had.
      if (report.unmatched === undefined) {
        throw httpError('The Report is missing its unmatched group.', response.status);
      }

      return report as Report;
    },
  });
}
