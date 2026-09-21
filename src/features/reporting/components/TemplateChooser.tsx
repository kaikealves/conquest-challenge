import { useId } from 'react';

import type { ReportTemplateSummary } from '../api/contract.ts';

type TemplateChooserProps = {
  readonly templates: readonly ReportTemplateSummary[];
  readonly selectedId: string;
  readonly onChoose: (templateId: string) => void;
};

/**
 * Picks the ReportTemplate a Report is shaped by. A native select: it is
 * keyboard and screen-reader accessible without any code of ours, which a
 * hand-built listbox would have to earn.
 */
export function TemplateChooser({ templates, selectedId, onChoose }: TemplateChooserProps) {
  const selectId = useId();

  return (
    <div className="flex items-center gap-3">
      <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
        Report template
      </label>
      <select
        id={selectId}
        value={selectedId}
        onChange={(event) => {
          onChoose(event.target.value);
        }}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  );
}
