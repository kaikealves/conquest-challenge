import { expect, test } from 'vitest';

import accountsAcrossNestedCategories from './fixtures/accounts-across-nested-categories.xml?raw';
import amountsBeyondFloatPrecision from './fixtures/amounts-beyond-float-precision.xml?raw';
import amountsThatBreakFloatingPoint from './fixtures/amounts-that-break-floating-point.xml?raw';
import anEntryCarryingBothColumns from './fixtures/an-entry-carrying-both-columns.xml?raw';
import aControlAccountAlsoPostedToDirectly from './fixtures/a-control-account-also-posted-to-directly.xml?raw';
import customerAndSupplierAuxiliaryAccounts from './fixtures/customer-and-supplier-auxiliary-accounts.xml?raw';
import journalsThatOnlyLookLikeOpeningBalances from './fixtures/journals-that-only-look-like-opening-balances.xml?raw';
import openingBalanceAndOrdinaryEntries from './fixtures/opening-balance-and-ordinary-entries.xml?raw';
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
  kind: 'ProfitAndLoss',
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
  kind: 'ProfitAndLoss',
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

const bank = { label: 'Bank', categoryRoots: ['512'] };

const balanceSheet: ReportTemplate = {
  id: 'balance-sheet',
  name: 'Balance sheet',
  kind: 'BalanceSheet',
  categories: [
    { label: 'Assets', categoryRoots: ['5'], children: [bank] },
    { label: 'Equity', categoryRoots: ['1'] },
  ],
  result: { label: 'Result', categoryRoots: ['6', '7'] },
};

const profitAndLossOverTheBank: ReportTemplate = {
  id: 'profit-and-loss-over-the-bank',
  name: 'A ProfitAndLoss whose CategoryRoot also matches a balance-sheet Account',
  kind: 'ProfitAndLoss',
  // A real ProfitAndLoss never names a balance-sheet Account. This one does, so
  // the carried-forward balance has somewhere to wrongly appear.
  categories: [bank],
};

async function only(template: ReportTemplate) {
  const [report] = await buildReports(inChunks(openingBalanceAndOrdinaryEntries), template);

  return report;
}

test('a BalanceSheet includes the balance carried forward from the year before', async () => {
  const report = await only(balanceSheet);

  // 1000.00 carried forward plus the 250.00 received this year.
  expect(report?.categories[0]?.children[0]?.total).toBe('1250.00');
});

test('a ProfitAndLoss leaves out the balance carried forward', async () => {
  const report = await only(profitAndLossOverTheBank);

  // Only the 250.00 that happened this year.
  expect(report?.categories[0]?.total).toBe('250.00');
});

test('the BalanceSheet balances once the Result is counted', async () => {
  const report = await only(balanceSheet);
  const totals = Object.fromEntries(report?.categories.map((c) => [c.label, c.total]) ?? []);

  expect(totals).toEqual({ Assets: '1250.00', Equity: '-1000.00', Result: '-250.00' });
  // Assets are debits (positive), Equity and the Result credits (negative), so
  // a BalanceSheet that balances nets to zero.
  expect(report?.categories.reduce((sum, category) => sum + Number(category.total), 0)).toBe(0);
});

test('a journal code that only resembles the carried-forward one is not left out', async () => {
  const [report] = await buildReports(
    inChunks(journalsThatOnlyLookLikeOpeningBalances),
    profitAndLossOverTheBank,
  );

  expect(report?.categories[0]?.total).toBe('12.00');
});

test('the Result lists the revenue and expense Accounts it is made of', async () => {
  const report = await only(balanceSheet);

  expect(report?.categories.at(-1)?.accounts).toEqual([
    { code: '706000', name: 'Prestations de services', total: '-250.00' },
  ]);
});

const partiesAndBank: ReportTemplate = {
  id: 'parties-and-bank',
  name: 'Customers, suppliers and the bank',
  kind: 'BalanceSheet',
  categories: [
    { label: 'Customers', categoryRoots: ['411'] },
    { label: 'Suppliers', categoryRoots: ['401'] },
    { label: 'Bank', categoryRoots: ['512'] },
  ],
};

async function partiesReport() {
  const [report] = await buildReports(
    inChunks(customerAndSupplierAuxiliaryAccounts),
    partiesAndBank,
  );

  return report;
}

test('Entries on each customer’s own Account are reported under the customers’ ControlAccount', async () => {
  const report = await partiesReport();
  const customers = report?.categories.find((category) => category.label === 'Customers');

  // 100.00 for one customer and 50.00 for the other, on one line.
  expect(customers?.total).toBe('150.00');
  expect(customers?.accounts.map((account) => [account.code, account.total])).toEqual([
    ['411100', '150.00'],
  ]);
});

test('the same holds on the supplier side, where the balance is a credit', async () => {
  const report = await partiesReport();
  const suppliers = report?.categories.find((category) => category.label === 'Suppliers');

  expect(suppliers?.total).toBe('-80.00');
  expect(suppliers?.accounts.map((account) => [account.code, account.total])).toEqual([
    ['401100', '-80.00'],
  ]);
});

test('no AuxiliaryAccount appears anywhere in a Report', async () => {
  // A template that matches every code the fixture has, so an AuxiliaryAccount
  // would be reported if it survived: an unmatched one is dropped and proves
  // nothing.
  const [report] = await buildReports(inChunks(customerAndSupplierAuxiliaryAccounts), {
    ...partiesAndBank,
    categories: [{ label: 'Everything', categoryRoots: ['0', '4', '5', '9'] }],
  });
  const everything = JSON.stringify(report);

  for (const auxiliary of ['0ACME', '0BOLT', '9ELEC', 'Acme', 'Bolt', 'Electricite']) {
    expect(everything).not.toContain(auxiliary);
  }
  expect(report?.categories[0]?.total).toBe('80.00');
});

test('an Entry posted straight to a Chart of Accounts Account is unaffected', async () => {
  const report = await partiesReport();
  const bank = report?.categories.find((category) => category.label === 'Bank');

  expect(bank?.accounts).toEqual([{ code: '512000', name: 'Banque', total: '10.00' }]);
});

test('a ControlAccount posted to directly keeps its own name, in whatever order the Entries arrive', async () => {
  const [report] = await buildReports(inChunks(aControlAccountAlsoPostedToDirectly), {
    ...partiesAndBank,
    categories: [{ label: 'Everything', categoryRoots: ['4', '5'] }],
  });

  // Customers' 5.00 and 1.00 land on the same line as the direct 20.00, and the
  // line is called what the Provider calls it, not blank.
  expect(report?.categories[0]?.accounts).toEqual([
    { code: '411100', name: 'Clients', total: '26.00' },
    { code: '512000', name: 'Banque', total: '3.00' },
    { code: '530000', name: 'Caisse', total: '2.00' },
  ]);
});
