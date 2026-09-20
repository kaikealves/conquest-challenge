import { expect, test } from 'vitest';

import beyondFloatPrecision from './fixtures/amounts-beyond-float-precision.xml?raw';
import floatingPointTrap from './fixtures/amounts-that-break-floating-point.xml?raw';
import twoPurchasesAndOneSale from './fixtures/two-purchases-and-one-sale.xml?raw';
import { buildReportFromProviderPayload } from './pipeline.ts';
import type { ReportTemplate } from '../../features/reporting/reportTemplate.ts';

/**
 * Seam 1: Provider payload in, Report out, across both bounded contexts.
 *
 * The intermediate domain model is an implementation detail and is not asserted
 * on. Fixtures are small and purpose-built, each named for the case it covers;
 * the supplied sample ledger is never used, because a failure in 30,000 Entries
 * is not legible.
 *
 * Payloads arrive in small chunks rather than as one string, because that is
 * how the importer is fed in production and because splitting mid-element is
 * exactly where a parser that only pretends to stream falls over.
 */
async function* inChunks(payload: string, size = 64): AsyncIterable<string> {
  for (let at = 0; at < payload.length; at += size) {
    // Each chunk arrives on its own tick, as a stream's would, so the parser is
    // exercised across await boundaries and not just across string splits.
    await Promise.resolve();

    yield payload.slice(at, at + size);
  }
}

const purchases: ReportTemplate = {
  name: 'Purchases only',
  categories: [{ label: 'Purchases', categoryRoots: ['606'] }],
};

test('a Category totals every Entry its CategoryRoot matches, and no others', async () => {
  const report = await buildReportFromProviderPayload(inChunks(twoPurchasesAndOneSale), purchases);

  expect(report.categories).toHaveLength(1);
  expect(report.categories[0]?.label).toBe('Purchases');
  expect(report.categories[0]?.total).toBe('150.50');
});

test('amounts stay exact where floating point would drift', async () => {
  const report = await buildReportFromProviderPayload(inChunks(floatingPointTrap), purchases);

  // 0.1 + 0.2 is 0.30000000000000004 as a JavaScript number.
  expect(report.categories[0]?.total).toBe('0.30');
});

test('amounts stay exact beyond the range a float can count cents in', async () => {
  const report = await buildReportFromProviderPayload(inChunks(beyondFloatPrecision), purchases);

  // A float gives 90071992547409.94 here, and rounding on the way out does not
  // recover the lost cent — so this fails for any implementation that is not
  // exact all the way through.
  expect(report.categories[0]?.total).toBe('90071992547409.93');
});
