import { expect, test } from 'vitest';

import accountsAcrossNestedCategories from './fixtures/accounts-across-nested-categories.xml?raw';
import amountsBeyondFloatPrecision from './fixtures/amounts-beyond-float-precision.xml?raw';
import amountsThatBreakFloatingPoint from './fixtures/amounts-that-break-floating-point.xml?raw';
import anEntryCarryingBothColumns from './fixtures/an-entry-carrying-both-columns.xml?raw';
import purchasesAcrossTwoFiscalYears from './fixtures/purchases-across-two-fiscal-years.xml?raw';
import { buildReports } from './buildReports.ts';
import type { ReportTemplate } from './reporting/reportTemplate.ts';

/**
 * Seam 1: Provider payload in, Report JSON out.
 *
 * The intermediate domain model is an implementation detail and is not asserted
 * on. Fixtures are small and purpose-built, each named for the case it covers;
 * the supplied sample ledger is never used, because a failure among 6774 Entries
 * is not legible.
 *
 * Payloads arrive in small chunks on separate ticks rather than as one string,
 * because that is how the importer is fed from a file and because splitting
 * mid-element is where a parser that only pretends to stream falls over.
 */
async function* inChunks(payload: string, size = 64): AsyncIterable<string> {
  for (let at = 0; at < payload.length; at += size) {
    await Promise.resolve();

    yield payload.slice(at, at + size);
  }
}

const purchases: ReportTemplate = {
  id: 'purchases',
  name: 'Purchases only',
  categories: [{ label: 'Purchases', categoryRoots: ['606'] }],
};

async function reportFor(fixture: string, period: string) {
  const reports = await buildReports(inChunks(fixture), purchases);

  return reports.find((report) => report.period === period);
}

test('a Category totals every Entry its CategoryRoot matches, and no others', async () => {
  const report = await reportFor(purchasesAcrossTwoFiscalYears, '2016');

  expect(report?.categories.map((category) => [category.label, category.total])).toEqual([
    ['Purchases', '150.50'],
  ]);
});

test('an Entry counts only towards the Period it falls in', async () => {
  const reports = await buildReports(inChunks(purchasesAcrossTwoFiscalYears), purchases);

  expect(reports.map((report) => report.period)).toEqual(['2016', '2017']);
  expect((await reportFor(purchasesAcrossTwoFiscalYears, '2017'))?.categories[0]?.total).toBe(
    '7.25',
  );
});

test('an Entry carrying both a debit and a credit is netted, not half discarded', async () => {
  const report = await reportFor(anEntryCarryingBothColumns, '2016');

  expect(report?.categories[0]?.total).toBe('100.00');
});

test('amounts stay exact where floating point would drift', async () => {
  const report = await reportFor(amountsThatBreakFloatingPoint, '2016');

  // 0.1 + 0.2 is 0.30000000000000004 as a JavaScript number.
  expect(report?.categories[0]?.total).toBe('0.30');
});

test('amounts stay exact beyond the range a float can count cents in', async () => {
  const report = await reportFor(amountsBeyondFloatPrecision, '2016');

  // A float gives 90071992547409.94, and rounding on the way out does not
  // recover the lost cent.
  expect(report?.categories[0]?.total).toBe('90071992547409.93');
});

const operatingExpenses: ReportTemplate = {
  id: 'operating-expenses',
  name: 'Operating expenses',
  categories: [
    {
      label: 'Operating expenses',
      categoryRoots: ['60', '61', '62', '63', '64'],
      children: [
        { label: 'Purchases', categoryRoots: ['60', '61', '62'] },
        { label: 'Staff costs', categoryRoots: ['63', '64'] },
      ],
    },
  ],
};

test("a parent Category's total is the sum of its children", async () => {
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), operatingExpenses);
  const parent = report?.categories[0];

  expect(parent?.label).toBe('Operating expenses');
  expect(parent?.total).toBe('500.50');
  expect(parent?.children.map((child) => [child.label, child.total])).toEqual([
    ['Purchases', '125.00'],
    ['Staff costs', '375.50'],
  ]);
});

test('an Account is listed once, at the deepest Category that matches it', async () => {
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), operatingExpenses);
  const parent = report?.categories[0];

  // The parent matches all four Accounts, but each belongs to a child. Listing
  // any of them on the parent too would show the same money twice.
  expect(parent?.accounts).toEqual([]);
  expect(parent?.children[0]?.accounts).toEqual([
    { code: '606100', name: 'Fournitures', total: '100.00' },
    { code: '613200', name: 'Locations', total: '25.00' },
  ]);
});
