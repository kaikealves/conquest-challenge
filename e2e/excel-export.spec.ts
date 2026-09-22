import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';

/**
 * The real download, in a real browser, against the built site — which is where
 * a file actually reaches a user. The export code loads ExcelJS on demand, so
 * this is also the proof that the split chunk is served and runs.
 */
test('the Report on screen downloads as a spreadsheet with real numbers', async ({ page }) => {
  const company = { id: 'export-demo-co', name: 'Export Demo Co', country: 'FR' };

  await page.route('**/data/companies.json', (route) =>
    route.fulfill({ json: { companies: [company] } }),
  );
  await page.route('**/data/companies/export-demo-co/templates.json', (route) =>
    route.fulfill({
      json: {
        company,
        templates: [{ id: 'alpha', name: 'Alpha', periods: ['2016'] }],
      },
    }),
  );
  await page.route('**/data/companies/export-demo-co/reports/alpha/2016.json', (route) =>
    route.fulfill({
      json: {
        company,
        templateId: 'alpha',
        templateName: 'Alpha',
        period: '2016',
        currency: 'EUR',
        categories: [
          {
            label: 'Expenses',
            total: '850.50',
            accounts: [],
            children: [
              {
                label: 'Services',
                total: '850.50',
                children: [],
                accounts: [{ code: '613200', name: 'Locations', total: '850.50' }],
              },
            ],
          },
        ],
        unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('row', { name: /Expenses/ })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export to Excel' }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('alpha-2016.xlsx');

  const saved = path.join(await mkdtemp(path.join(tmpdir(), 'export-')), 'alpha-2016.xlsx');
  await download.saveAs(saved);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(saved);
  const sheet = workbook.worksheets[0];
  const cells: Record<string, unknown> = {};

  sheet?.eachRow((row) => {
    cells[row.getCell(2).text || row.getCell(1).text] = row.getCell(3).value;
  });

  expect(cells['Expenses']).toBe(850.5);
  expect(cells['Locations']).toBe(850.5);
  expect(cells['Unmatched']).toBe(0);
  expect(sheet?.getCell('A1').value).toContain('Export Demo Co');
});
