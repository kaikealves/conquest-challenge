import { useState } from 'react';

import type { Report } from '../api/contract.ts';
import { downloadReport } from '../export/downloadReport.ts';

type ExportButtonProps = {
  readonly report: Report;
};

/** Offers the Report on screen as an Excel file. */
export function ExportButton({ report }: ExportButtonProps) {
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle');

  const exportReport = async () => {
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
        disabled={state === 'working'}
        onClick={() => void exportReport()}
        className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-60"
      >
        {state === 'working' ? 'Preparing…' : 'Export to Excel'}
      </button>
      {state === 'failed' && (
        <p role="alert" className="text-sm text-red-700">
          The export failed. Try again.
        </p>
      )}
    </div>
  );
}
