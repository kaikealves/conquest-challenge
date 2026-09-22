import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { httpError } from '../../../shared/httpError.ts';
import { companiesUrl, type CompaniesIndex } from './contract.ts';

/** Every Company this deployment has data for, so a user can switch between them. */
export function useCompanies(): UseQueryResult<CompaniesIndex> {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async ({ signal }) => {
      const response = await fetch(companiesUrl(), { signal });

      if (!response.ok) {
        throw httpError(
          `Could not load the list of Companies (${String(response.status)}).`,
          response.status,
        );
      }

      const index = (await response.json()) as Partial<CompaniesIndex>;

      if (index.companies === undefined) {
        throw httpError('The Company index is missing its companies.', response.status);
      }

      return index as CompaniesIndex;
    },
  });
}
