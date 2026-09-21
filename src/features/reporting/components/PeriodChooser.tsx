import { useId } from 'react';

type PeriodChooserProps = {
  readonly periods: readonly string[];
  readonly selected: string;
  readonly onChoose: (period: string) => void;
};

/** Picks the Period a Report covers, so one FiscalYear can be read against another. */
export function PeriodChooser({ periods, selected, onChoose }: PeriodChooserProps) {
  const selectId = useId();

  return (
    <div className="flex items-center gap-3">
      <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
        Period
      </label>
      <select
        id={selectId}
        value={selected}
        onChange={(event) => {
          onChoose(event.target.value);
        }}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
      >
        {periods.map((period) => (
          <option key={period} value={period}>
            {period}
          </option>
        ))}
      </select>
    </div>
  );
}
