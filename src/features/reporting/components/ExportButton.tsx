import { useState } from 'react';

import type { Report } from '../api/contract.ts';
import { downloadReport } from '../export/downloadReport.ts';

type ExportButtonProps = {
  readonly report: Report;
};

const MESSAGES = {
  idle: '',
  working: 'Preparing the file…',
  failed: 'The export failed. Reload the page and try again.',
} as const;

/**
 * Offers the Report on screen as an Excel file.
 *
 * While the file is being made the button is `aria-disabled` rather than
 * `disabled`: a disabled button that has focus drops it to the page, and a
 * keyboard user would lose their place. Its clicks are ignored instead. The
 * outcome goes in a live region that is always mounted, so it is announced.
 */
export function ExportButton({ report }: ExportButtonProps) {
  const [state, setState] = useState<keyof typeof MESSAGES>('idle');

  const exportReport = async () => {
    if (state === 'working') {
      return;
    }

    setState('working');

    try {
      await downloadReport(report);
      setState('idle');
    } catch (cause) {
      console.error('The Excel export failed.', cause);
      setState('failed');
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-disabled={state === 'working'}
        onClick={() => void exportReport()}
        className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-900 hover:bg-slate-50 aria-disabled:opacity-60"
      >
        Export to Excel
      </button>
      <p role="status" className={state === 'failed' ? 'text-sm text-red-700' : 'sr-only'}>
        {MESSAGES[state]}
      </p>
    </div>
  );
}
