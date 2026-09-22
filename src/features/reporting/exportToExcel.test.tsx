import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExcelJS from 'exceljs';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { REPORT_URL_PATTERN, TEMPLATE_INDEX_URL_PATTERN } from './api/contract.ts';
import { server } from '../../shared/mocks/node.ts';

import { renderApp } from '../../shared/testing/renderApp.tsx';

/**
 * Seam 2: the user exports the Report they are looking at.
 *
 * The download itself is the browser's, so it is intercepted where the
 * application hands over the file: the Blob given to `URL.createObjectURL` and
 * the name on the link that is clicked. The file is then opened with ExcelJS the
 * way Excel would, and the assertions read cells, not internals.
 */
const revoke = vi.fn();
let file: Blob | undefined;
let fileName: string | undefined;

beforeEach(() => {
  revoke.mockClear();
  file = undefined;
  fileName = undefined;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    file = blob;

    return 'blob:the-export';
  });
  URL.revokeObjectURL = revoke;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    fileName = this.download;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** jsdom's Blob has no `arrayBuffer()`, so read it the way a page would. */
function bytesOf(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(new Error('The exported file could not be read.'));
    };
    reader.readAsArrayBuffer(blob);
  });
}

const text = (cell: ExcelJS.Cell) => (typeof cell.value === 'string' ? cell.value : '');

async function exportFrom(path: string): Promise<ExcelJS.Worksheet> {
  const user = userEvent.setup();
  renderApp(path);

  await user.click(await screen.findByRole('button', { name: 'Export to Excel' }));
  await vi.waitFor(() => {
    expect(file).toBeDefined();
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await bytesOf(file as Blob));
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error('The exported file has no worksheet.');
  }

  return sheet;
}

/** The rows of the sheet as [label, total, outline level]. */
function rowsOf(sheet: ExcelJS.Worksheet): [string, unknown, number][] {
  const rows: [string, unknown, number][] = [];

  sheet.eachRow((row) => {
    rows.push([
      `${text(row.getCell(1))} ${text(row.getCell(2))}`.trim(),
      row.getCell(3).value,
      row.outlineLevel ?? 0,
    ]);
  });

  return rows;
}

/** The sheet row whose name cell reads `label` (the Category or Account name). */
function rowOf(sheet: ExcelJS.Worksheet, label: string): ExcelJS.Row {
  let found: ExcelJS.Row | undefined;

  sheet.eachRow((row) => {
    if (row.getCell(2).text === label) {
      found = row;
    }
  });

  if (!found) {
    throw new Error(`No row for ${label}.`);
  }

  return found;
}

const totalOf = (sheet: ExcelJS.Worksheet, label: string) =>
  rowsOf(sheet).find(([text]) => text === label)?.[1];

test('the Report on screen downloads as an Excel file named for it', async () => {
  await exportFrom('/companies/northwind-freight/reports/french-profit-and-loss/2016');

  expect(fileName).toBe('french-profit-and-loss-2016.xlsx');
});

test('amounts are numbers a spreadsheet can compute with, credits negative', async () => {
  const sheet = await exportFrom(
    '/companies/northwind-freight/reports/french-profit-and-loss/2016',
  );

  expect(totalOf(sheet, 'Operating expenses')).toBe(2350.5);
  expect(totalOf(sheet, 'Operating income')).toBe(-9125.25);
});

test('the Category hierarchy is kept as grouped rows, Accounts beneath their Category', async () => {
  const sheet = await exportFrom(
    '/companies/northwind-freight/reports/french-profit-and-loss/2016',
  );
  const rows = rowsOf(sheet);
  const at = (label: string) => rows.findIndex(([text]) => text === label);

  const parent = rows[at('Operating expenses')];
  const child = rows[at('External services')];
  const account = rows[at('613200 Locations immobilières')];

  expect([parent?.[2], child?.[2], account?.[2]]).toEqual([0, 1, 2]);
  // Depth-first: the parent, then its child, then the child's Accounts.
  expect(at('Operating expenses')).toBeLessThan(at('External services'));
  expect(at('External services')).toBeLessThan(at('613200 Locations immobilières'));
  expect(account?.[1]).toBe(700);
});

test('the export is of the ReportTemplate and Period displayed', async () => {
  const sheet = await exportFrom(
    '/companies/northwind-freight/reports/french-profit-and-loss/2015',
  );

  expect(totalOf(sheet, 'Operating expenses')).toBe(4701);
  expect(sheet.getCell('A1').value).toContain('Profit and loss');
  expect(sheet.getCell('A1').value).toContain('2015');
});

test('the exported file says whose Company it is, so it is self-describing once it leaves the page', async () => {
  const sheet = await exportFrom(
    '/companies/northwind-freight/reports/french-profit-and-loss/2016',
  );

  expect(sheet.getCell('A1').value).toContain('Northwind Freight Cooperative');
});

test('the unmatched group is exported even when it is empty', async () => {
  const sheet = await exportFrom(
    '/companies/northwind-freight/reports/french-profit-and-loss/2016',
  );

  expect(totalOf(sheet, 'Unmatched')).toBe(0);
});

test('unmatched Accounts are exported with their amounts', async () => {
  const sheet = await exportFrom(
    '/companies/northwind-freight/reports/french-profit-and-loss/2015',
  );

  expect(totalOf(sheet, 'Unmatched')).toBe(80);
  expect(totalOf(sheet, '471000 Compte d’attente')).toBe(80);
});

test('the Result of a BalanceSheet is exported like any other Category', async () => {
  const sheet = await exportFrom('/companies/northwind-freight/reports/french-balance-sheet/2016');

  expect(totalOf(sheet, 'Result')).toBe(-1000);
});

test('a failed export says so and can be tried again', async () => {
  const user = userEvent.setup();
  URL.createObjectURL = vi.fn(() => {
    throw new Error('no disk');
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  renderApp('/companies/northwind-freight/reports/french-profit-and-loss/2016');

  await user.click(await screen.findByRole('button', { name: 'Export to Excel' }));

  expect(await screen.findByText(/export failed/i)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Export to Excel' })).toBeEnabled();
});

/** A Report the mock does not serve, for cases that need particular labels or codes. */
async function exportOf(
  categories: unknown[],
  templateName = 'Custom',
): Promise<ExcelJS.Worksheet> {
  const company = { id: 'northwind-freight', name: 'Custom Co', country: 'FR' };

  server.use(
    http.get(TEMPLATE_INDEX_URL_PATTERN, () =>
      HttpResponse.json({
        company,
        templates: [{ id: 'custom', name: templateName, periods: ['2016'] }],
      }),
    ),
    http.get(REPORT_URL_PATTERN, () =>
      HttpResponse.json({
        company,
        templateId: 'custom',
        templateName,
        period: '2016',
        currency: 'EUR',
        unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
        categories,
      }),
    ),
  );

  return exportFrom('/companies/northwind-freight/reports/custom/2016');
}

const withAccount = (code: string, name: string, total: string) => [
  {
    label: 'Category',
    total,
    children: [],
    accounts: [{ code, name, total }],
  },
];

test('a template name Excel would refuse for a sheet still exports', async () => {
  for (const name of ["'Quoted'", 'History', 'A: B/C [D]', 'x'.repeat(40), '   ']) {
    file = undefined;
    const sheet = await exportOf(withAccount('1', 'Acc', '1.00'), name);

    expect(sheet.name.length).toBeLessThanOrEqual(31);
    expect(sheet.name).not.toMatch(/[[\]:*?/\\]/);
    cleanup();
  }
});

test('an AccountCode with a leading zero stays text, so the zero survives', async () => {
  const sheet = await exportOf(withAccount('007000', 'Zero-led', '1.00'));
  const row = rowOf(sheet, 'Zero-led');

  expect(row.getCell(1).value).toBe('007000');
  expect(row.getCell(1).numFmt).toBe('@');
});

test('credits are shown in parentheses and the sign stays in the value', async () => {
  const sheet = await exportOf(withAccount('706', 'Sales', '-9.50'));
  const cell = rowOf(sheet, 'Sales').getCell(3);

  expect(cell.value).toBe(-9.5);
  expect(cell.numFmt).toBe('#,##0.00;(#,##0.00)');
});

test('a whole-number amount still carries the currency’s decimals, as on screen', async () => {
  const sheet = await exportOf(withAccount('706', 'Whole', '850'));

  expect(rowOf(sheet, 'Whole').getCell(3).numFmt).toBe('#,##0.00;(#,##0.00)');
});

test('a Category’s rows are indented by depth and the header stays in view', async () => {
  const sheet = await exportFrom(
    '/companies/northwind-freight/reports/french-profit-and-loss/2016',
  );
  const indent = (label: string) => rowOf(sheet, label).getCell(2).alignment?.indent ?? 0;

  expect(indent('Operating expenses')).toBe(0);
  expect(indent('External services')).toBe(1);
  expect(indent('Locations immobilières')).toBe(2);
  expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 2 });
});

test('the file’s address is not released until the browser has had time to fetch it', async () => {
  await exportFrom('/companies/northwind-freight/reports/french-profit-and-loss/2016');

  expect(revoke).not.toHaveBeenCalled();
});
