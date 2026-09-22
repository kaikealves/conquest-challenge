import type { ReportTemplateSummary } from '../api/contract.ts';
import { SelectField } from './SelectField.tsx';

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
  return (
    <SelectField label="Report template" value={selectedId} onChange={onChoose}>
      {templates.map((template) => (
        <option key={template.id} value={template.id}>
          {template.name}
        </option>
      ))}
    </SelectField>
  );
}
