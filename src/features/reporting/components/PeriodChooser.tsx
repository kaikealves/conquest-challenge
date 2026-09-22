import { SelectField } from './SelectField.tsx';

type PeriodChooserProps = {
  readonly periods: readonly string[];
  readonly selected: string;
  readonly onChoose: (period: string) => void;
};

/** Picks the Period a Report covers, so one FiscalYear can be read against another. */
export function PeriodChooser({ periods, selected, onChoose }: PeriodChooserProps) {
  return (
    <SelectField label="Period" value={selected} onChange={onChoose}>
      {periods.map((period) => (
        <option key={period} value={period}>
          {period}
        </option>
      ))}
    </SelectField>
  );
}
