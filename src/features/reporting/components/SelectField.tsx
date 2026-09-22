import { useId, type ReactNode } from 'react';

type SelectFieldProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly children: ReactNode;
};

/**
 * The look shared by every Report picker: a native `<select>` — see
 * `TemplateChooser` for why native rather than a hand-built listbox — restyled
 * to read as a deliberate combobox rather than a bare form control.
 */
export function SelectField({ label, value, onChange, children }: SelectFieldProps) {
  const selectId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-xs font-medium tracking-wide text-slate-500">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pr-9 pl-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-500"
        >
          <path
            d="M5.5 7.5 10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
