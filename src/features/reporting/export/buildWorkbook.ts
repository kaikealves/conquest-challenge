import type ExcelJS from 'exceljs';

import type { Category, Report } from '../api/contract.ts';

/**
 * Lays a Report out as a spreadsheet.
 *
 * It works from the Report already in memory, so nothing is fetched, and it
 * mirrors the tree rather than flattening it: each Category is a row, its
 * children and Accounts are the rows beneath it, and every row carries an
 * outline level so Excel can fold a Category away exactly as the screen does.
 *
 * Amounts arrive as exact decimal strings and leave as numbers, because a
 * spreadsheet cell that holds text cannot be summed. That conversion is the one
 * place precision is given up, and it is the spreadsheet's own: a cell is a
 * double, and Excel keeps fifteen significant digits whatever is written to it.
 */
const DECIMAL = /^-?\d+(\.\d+)?$/;

/** Excel groups rows at most eight deep: levels 0 to 7. */
const DEEPEST_OUTLINE_LEVEL = 7;

/**
 * A worksheet name may not hold `[ ] : * ? / \`, may not start or end with an
 * apostrophe, may not be `History` (Excel reserves it), and stops at 31
 * characters. Each of those makes ExcelJS throw, and a throw here would fail the
 * export for a template whose name the user cannot change, every time.
 */
export function sheetNameFor(templateName: string): string {
  const cleaned = templateName
    .replace(/[[\]:*?/\\]/g, ' ')
    .trim()
    .slice(0, 31)
    .replace(/^'+|'+$/g, '')
    .trim();

  return cleaned === '' || cleaned.toLowerCase() === 'history' ? 'Report' : cleaned;
}

export function fileNameFor(report: Report): string {
  return `${report.templateId}-${report.period}.xlsx`;
}

/**
 * The decimal places the currency has, the same answer the screen's formatting
 * gives, so a whole-number amount is not shown as `850` in one place and
 * `€850.00` in the other.
 */
function fractionDigitsFor(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .minimumFractionDigits ?? 2
  );
}

/** Credits in parentheses, as on screen; the sign is still there in the value. */
function numberFormat(fractionDigits: number): string {
  const shown = fractionDigits === 0 ? '#,##0' : `#,##0.${'0'.repeat(fractionDigits)}`;

  return `${shown};(${shown})`;
}

function cellValueFor(amount: string): number | string {
  // A malformed amount is a contract violation. Writing it as text keeps it
  // visible in the sheet, where a NaN would be a blank that looks like nothing.
  return DECIMAL.test(amount) ? Number(amount) : amount;
}

export async function buildWorkbook(report: Report): Promise<ExcelJS.Workbook> {
  // Loaded when the user asks, so its weight is not in the bundle every visitor
  // downloads to read a Report.
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetNameFor(report.templateName), {
    properties: { outlineProperties: { summaryBelow: false, summaryRight: true } },
  });
  const format = numberFormat(fractionDigitsFor(report.currency));

  sheet.columns = [{ width: 14 }, { width: 46 }, { width: 18 }];

  sheet.addRow([
    `${report.templateName} · Period ${report.period} · amounts in ${report.currency}`,
  ]);
  sheet.getRow(1).font = { bold: true, size: 13 };

  const header = sheet.addRow(['Code', 'Category / Account', `Total (${report.currency})`]);
  header.font = { bold: true };
  header.getCell(3).alignment = { horizontal: 'right' };

  const add = (category: Category, depth: number): void => {
    const level = Math.min(depth, DEEPEST_OUTLINE_LEVEL);
    const row = sheet.addRow(['', category.label, cellValueFor(category.total)]);

    row.outlineLevel = level;
    row.font = { bold: true };
    row.getCell(2).alignment = { indent: depth };
    row.getCell(3).numFmt = format;

    for (const child of category.children) {
      add(child, depth + 1);
    }

    for (const account of category.accounts) {
      const accountRow = sheet.addRow([account.code, account.name, cellValueFor(account.total)]);

      accountRow.outlineLevel = Math.min(depth + 1, DEEPEST_OUTLINE_LEVEL);
      accountRow.getCell(1).numFmt = '@';
      accountRow.getCell(2).alignment = { indent: depth + 1 };
      accountRow.getCell(3).numFmt = format;
    }
  };

  // The Categories, then the group of what none of them claimed — a sibling of
  // `categories` in the payload, so a walk of `categories` alone would drop it.
  for (const category of [...report.categories, report.unmatched]) {
    add(category, 0);
  }

  sheet.views = [{ state: 'frozen', ySplit: 2 }];

  return workbook;
}
