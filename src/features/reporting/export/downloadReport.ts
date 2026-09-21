import type { Report } from '../api/contract.ts';
import { buildWorkbook, fileNameFor } from './buildWorkbook.ts';

/**
 * Builds the workbook and hands it to the browser as a download, without a
 * server: the file is made here, from the Report already in memory.
 */
export async function downloadReport(report: Report): Promise<void> {
  const workbook = await buildWorkbook(report);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileNameFor(report);
  link.click();

  // The click has been queued by the time this runs; releasing the URL any
  // sooner can cancel the download in some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
