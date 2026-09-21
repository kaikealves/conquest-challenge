import { expect, test } from 'vitest';

import accountsAcrossNestedCategories from './fixtures/accounts-across-nested-categories.xml?raw';
import accountsOfUnusualLength from './fixtures/accounts-of-unusual-length.xml?raw';
import amountsBeyondFloatPrecision from './fixtures/amounts-beyond-float-precision.xml?raw';
import amountsThatBreakFloatingPoint from './fixtures/amounts-that-break-floating-point.xml?raw';
import anEntryCarryingBothColumns from './fixtures/an-entry-carrying-both-columns.xml?raw';
import aControlAccountAlsoPostedToDirectly from './fixtures/a-control-account-also-posted-to-directly.xml?raw';
import customerAndSupplierAuxiliaryAccounts from './fixtures/customer-and-supplier-auxiliary-accounts.xml?raw';
import journalsThatOnlyLookLikeOpeningBalances from './fixtures/journals-that-only-look-like-opening-balances.xml?raw';
import openingBalanceAndOrdinaryEntries from './fixtures/opening-balance-and-ordinary-entries.xml?raw';
import purchasesAcrossTwoFiscalYears from './fixtures/purchases-across-two-fiscal-years.xml?raw';
import { buildReports } from './buildReports.ts';
import type { Category, Report } from './reporting/report.ts';
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

/** Every Account a Report lists, wherever it sits, as code → total. */
function listedAccounts(categories: readonly Category[]): [string, string][] {
  return categories.flatMap((category) => [
    ...category.accounts.map((account): [string, string] => [account.code, account.total]),
    ...listedAccounts(category.children),
  ]);
}

const revenue = (roots: string[], services: string[]): ReportTemplate => ({
  id: 'revenue',
  name: 'Revenue',
  kind: 'ProfitAndLoss',
  categories: [
    { label: 'Revenue', categoryRoots: roots },
    { label: 'Services', categoryRoots: services },
  ],
});

async function revenueReport(template: ReportTemplate) {
  const [report] = await buildReports(inChunks(accountsOfUnusualLength), template);

  return report;
}

const totalOf = (report: Report | undefined, label: string) =>
  report?.categories.find((category) => category.label === label)?.total;

test('an Account whose code is shorter than a CategoryRoot is left out of it, without error', async () => {
  // 70 and 706 are both shorter than the root 706000, so neither is listed.
  const report = await revenueReport(revenue(['701000'], ['706000']));

  expect(listedAccounts(report?.categories ?? [])).toEqual([
    ['701000', '-16.00'],
    ['706000', '-4.00'],
    ['70600000001', '-8.00'],
  ]);
});

test('an Account with a code longer than six characters is matched on its prefix', async () => {
  const report = await revenueReport(revenue(['9'], ['706']));

  // The 11-character code sits under 706 without being truncated or parsed.
  expect(listedAccounts(report?.categories ?? [])).toContainEqual(['70600000001', '-8.00']);
  expect(totalOf(report, 'Services')).toBe('-14.00');
});

test('an Account of three characters matches a three-character CategoryRoot exactly', async () => {
  const report = await revenueReport(revenue(['9'], ['706']));

  expect(listedAccounts(report?.categories ?? [])).toContainEqual(['706', '-2.00']);
});

test('where sibling CategoryRoots overlap, the most specific one wins', async () => {
  // Revenue takes everything under 70; Services takes what is under 706.
  const report = await revenueReport(revenue(['70'], ['706']));

  expect(totalOf(report, 'Services')).toBe('-14.00');
  expect(totalOf(report, 'Revenue')).toBe('-17.00');
});

test('an Account is listed once, so no amount is counted twice', async () => {
  const report = await revenueReport(revenue(['70'], ['706']));
  const codes = listedAccounts(report?.categories ?? []).map(([code]) => code);

  expect(new Set(codes).size).toBe(codes.length);
  // Five Accounts, 31.00 in all, and the two Categories account for exactly that.
  expect(codes).toHaveLength(5);
  expect(Number(totalOf(report, 'Revenue')) + Number(totalOf(report, 'Services'))).toBe(-31);
});

test('which sibling wins does not depend on the order the Categories are written in', async () => {
  const forward = await revenueReport(revenue(['70'], ['706']));
  const reversed = await revenueReport({
    ...revenue(['70'], ['706']),
    categories: [...revenue(['70'], ['706']).categories].reverse(),
  });

  expect(totalOf(reversed, 'Services')).toBe(totalOf(forward, 'Services'));
  expect(totalOf(reversed, 'Revenue')).toBe(totalOf(forward, 'Revenue'));
});

test('when two Categories match an Account equally well, the first one written takes it', async () => {
  const report = await revenueReport(revenue(['706'], ['706']));

  expect(totalOf(report, 'Revenue')).toBe('-14.00');
  expect(totalOf(report, 'Services')).toBe('0.00');
});

test('a CategoryRoot longer than the parent’s claims an Account for a nested Category over a sibling of the parent', async () => {
  const template: ReportTemplate = {
    id: 'nested-and-sibling',
    name: 'Nested and sibling',
    kind: 'ProfitAndLoss',
    categories: [
      {
        label: 'Sales',
        categoryRoots: ['70'],
        children: [{ label: 'Goods', categoryRoots: ['701'] }],
      },
      { label: 'Services', categoryRoots: ['706'] },
    ],
  };
  const report = await revenueReport(template);

  // 706… goes to the sibling Services (root 706), not to Sales (root 70); 701000
  // goes to the child Goods (root 701), not to its parent.
  expect(totalOf(report, 'Services')).toBe('-14.00');
  expect(report?.categories[0]?.children[0]?.total).toBe('-16.00');
  expect(totalOf(report, 'Sales')).toBe('-17.00');
});

test('a Category with several CategoryRoots is as specific as its longest matching one', async () => {
  // Revenue has both a short and a long root; Services has one in between. The
  // account 706000 is under all three, and Revenue's 7060 is the narrowest.
  const template: ReportTemplate = {
    id: 'several-roots',
    name: 'Several roots',
    kind: 'ProfitAndLoss',
    categories: [
      { label: 'Services', categoryRoots: ['706'] },
      { label: 'Revenue', categoryRoots: ['70', '7060'] },
    ],
  };
  const report = await revenueReport(template);

  // 706000 and 70600000001 are under 7060, and 70 and 701000 only under 70; 706 is
  // under Services' longer root, so it stays there.
  expect(totalOf(report, 'Revenue')).toBe('-29.00');
  expect(totalOf(report, 'Services')).toBe('-2.00');
});

test('a child Category may claim an Account its parent’s own roots do not select', async () => {
  const template: ReportTemplate = {
    id: 'child-outside-parent',
    name: 'Child outside parent',
    kind: 'ProfitAndLoss',
    categories: [
      {
        label: 'Services',
        categoryRoots: ['706'],
        children: [{ label: 'Goods', categoryRoots: ['701'] }],
      },
    ],
  };
  const report = await revenueReport(template);

  // The parent's total is everything beneath it: its own 706 Accounts and the
  // child's 701000, which the parent's roots alone would not have taken.
  expect(report?.categories[0]?.children[0]?.total).toBe('-16.00');
  expect(totalOf(report, 'Services')).toBe('-30.00');
});

test('an Account a chart Category has claimed is not counted again in the Result', async () => {
  const [report] = await buildReports(inChunks(accountsOfUnusualLength), {
    id: 'overlapping-result',
    name: 'Overlapping Result',
    kind: 'BalanceSheet',
    categories: [{ label: 'Services', categoryRoots: ['706'] }],
    result: { label: 'Result', categoryRoots: ['70'] },
  });

  // 706… (-14.00) is Services'; the Result takes only the other two.
  expect(totalOf(report, 'Services')).toBe('-14.00');
  expect(totalOf(report, 'Result')).toBe('-17.00');
});

const fixtures = {
  purchasesAcrossTwoFiscalYears,
  amountsThatBreakFloatingPoint,
  amountsBeyondFloatPrecision,
  anEntryCarryingBothColumns,
  accountsAcrossNestedCategories,
  accountsOfUnusualLength,
  customerAndSupplierAuxiliaryAccounts,
  aControlAccountAlsoPostedToDirectly,
  journalsThatOnlyLookLikeOpeningBalances,
  openingBalanceAndOrdinaryEntries,
};

/**
 * What the ledger says each Period nets to, read straight off the payload with
 * no help from the importer: an independent oracle for "nothing was lost".
 */
function netByPeriod(payload: string): Map<string, bigint> {
  const cents = (text: string) => {
    const [whole = '0', fraction = ''] = text.split('.');

    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  };
  const net = new Map<string, bigint>();

  for (const [, entry = ''] of payload.matchAll(
    /<wsGeneralLedger>([\s\S]*?)<\/wsGeneralLedger>/g,
  )) {
    const field = (name: string) =>
      new RegExp(`<${name}>([^<]*)</${name}>`).exec(entry)?.[1] ?? '0';
    const period = field('date').slice(0, 4);

    net.set(period, (net.get(period) ?? 0n) + cents(field('debit')) - cents(field('credit')));
  }

  return net;
}

const toCents = (decimal: string) => BigInt(decimal.replace('.', ''));

const matchesNothingButPurchases: ReportTemplate = {
  ...purchases,
  categories: [{ label: 'Purchases', categoryRoots: ['606'] }],
};

test('every Entry is either in a Category or in the unmatched group: nothing disappears', async () => {
  for (const [name, payload] of Object.entries(fixtures)) {
    // A BalanceSheet takes carried-forward balances too, so its total is the
    // whole ledger's net; a ProfitAndLoss deliberately leaves them out.
    const reports = await buildReports(inChunks(payload), {
      ...matchesNothingButPurchases,
      kind: 'BalanceSheet',
    });
    const expected = netByPeriod(payload);

    for (const report of reports) {
      const inReport = [...report.categories, report.unmatched].reduce(
        (sum, category) => sum + toCents(category.total),
        0n,
      );

      expect(inReport, `${name}, ${report.period}`).toBe(expected.get(report.period));
    }
  }
});

test('the Accounts no Category claimed are collected, with their total', async () => {
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), operatingExpenses);

  // The customer Account 411100 is under no CategoryRoot of this template.
  expect(report?.unmatched.total).toBe('-500.50');
  expect(report?.unmatched.accounts.map((account) => [account.code, account.total])).toEqual([
    ['411100', '-500.50'],
  ]);
});

test('a ReportTemplate that covers everything reports an empty unmatched group, not none', async () => {
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), {
    ...operatingExpenses,
    categories: [{ label: 'Everything', categoryRoots: ['6', '4'] }],
  });

  expect(report?.unmatched).toEqual({
    label: 'Unmatched',
    total: '0.00',
    children: [],
    accounts: [],
  });
});

test('an Account the Result has taken is not also unmatched', async () => {
  const [report] = await buildReports(inChunks(openingBalanceAndOrdinaryEntries), balanceSheet);

  // 706000 is the Result's; 512000 and 101000 are the Categories'.
  expect(report?.unmatched.accounts).toEqual([]);
});

test('an Account outside a template’s scope is out of scope, not unmatched', async () => {
  // A ProfitAndLoss answers for revenue and expense Accounts. The customer
  // Account 411100 is a balance-sheet one, so leaving it out is correct and
  // reporting it as a gap would be noise on every ProfitAndLoss.
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), {
    ...operatingExpenses,
    scope: ['6', '7'],
  });

  expect(report?.unmatched.accounts).toEqual([]);
});

test('an Account inside the scope that no Category claimed is still unmatched', async () => {
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), {
    ...operatingExpenses,
    // Nothing in this template covers 64x staff costs' sibling 65x, so narrow the
    // Categories and keep 64 in scope.
    categories: [{ label: 'Purchases', categoryRoots: ['60', '61', '62'] }],
    scope: ['6'],
  });

  // 641000 and 645000 are in scope (class 6) and under no Category.
  expect(report?.unmatched.accounts.map((account) => account.code)).toEqual(['641000', '645000']);
});
