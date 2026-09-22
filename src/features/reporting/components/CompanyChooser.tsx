import type { Company } from '../api/contract.ts';
import { SelectField } from './SelectField.tsx';

type CompanyChooserProps = {
  readonly companies: readonly Company[];
  readonly selectedId: string;
  readonly onChoose: (companyId: string) => void;
};

/**
 * Picks the Company a Report belongs to, the same shape as `TemplateChooser`
 * and `PeriodChooser`.
 *
 * Choosing a Company never tries to keep the current ReportTemplate or
 * Period: a different Company can have an entirely different chart of
 * accounts, so "keep the same ReportTemplate id" would work only by
 * coincidence. See ADR-0010.
 */
export function CompanyChooser({ companies, selectedId, onChoose }: CompanyChooserProps) {
  return (
    <SelectField label="Company" value={selectedId} onChange={onChoose}>
      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </SelectField>
  );
}
