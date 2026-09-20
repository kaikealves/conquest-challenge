import { expect, test } from 'vitest';

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

  expect(report?.categories).toEqual([{ label: 'Purchases', total: '150.50' }]);
});

test('an Entry counts only towards the Period it falls in', async () => {
  const reports = await buildReports(inChunks(purchasesAcrossTwoFiscalYears), purchases);

  expect(reports.map((report) => report.period)).toEqual(['2016', '2017']);
  expect((await reportFor(purchasesAcrossTwoFiscalYears, '2017'))?.categories).toEqual([
    { label: 'Purchases', total: '7.25' },
  ]);
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
