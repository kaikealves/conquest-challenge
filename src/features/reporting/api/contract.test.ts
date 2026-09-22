import { expect, test } from 'vitest';

import { buildReports } from '../../../../tools/importer/buildReports.ts';
import accountsAcrossNestedCategories from '../../../../tools/importer/fixtures/accounts-across-nested-categories.xml?raw';
import type { ReportTemplate } from '../../../../tools/importer/reporting/reportTemplate.ts';
import type { Category, Report } from './contract.ts';

/**
 * The contract test.
 *
 * The application declares what it expects and the importer produces it, with
 * nothing shared between them but the payload shape. This test is the only thing
 * holding those two ends together, which is why it imports the importer —
 * something no application code does.
 */
async function* inChunks(payload: string, size = 64): AsyncIterable<string> {
  for (let at = 0; at < payload.length; at += size) {
    await Promise.resolve();

    yield payload.slice(at, at + size);
  }
}

const template: ReportTemplate = {
  id: 'operating-expenses',
  name: 'Operating expenses',
  country: 'FR',
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

const EXACT_DECIMAL = /^-?\d+\.\d{2}$/;

function everyAmountIn(category: Category): string[] {
  return [
    category.total,
    ...category.accounts.map((account) => account.total),
    ...category.children.flatMap(everyAmountIn),
  ];
}

test('what the importer writes satisfies the type the application reads', async () => {
  const [produced] = await buildReports(inChunks(accountsAcrossNestedCategories), template, {
    id: 'contract-test-co',
    name: 'Contract Test Co',
    country: 'FR',
  });

  // The annotation is the assertion, and deliberately not a cast: if the
  // importer's output stops satisfying the client's contract, this file stops
  // compiling rather than failing at runtime in front of a user.
  const report: Report | undefined = produced;

  // An annotation only proves the client's fields exist in the output, not that
  // the output has no field the client has never heard of. Naming the whole set
  // catches a server that starts sending something the application ignores.
  expect(Object.keys(produced ?? {}).sort()).toEqual(
    [
      'categories',
      'company',
      'currency',
      'period',
      'templateId',
      'templateName',
      'unmatched',
    ].sort(),
  );
  expect(report?.company).toEqual({
    id: 'contract-test-co',
    name: 'Contract Test Co',
    country: 'FR',
  });
  expect(report?.templateId).toBe('operating-expenses');
  expect(report?.period).toBe('2016');
  expect(report?.currency).toBe('EUR');
});

test('every amount crosses the boundary as an exact decimal string', async () => {
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), template);
  const amounts = [...(report?.categories ?? []), ...(report ? [report.unmatched] : [])].flatMap(
    everyAmountIn,
  );

  expect(amounts.length).toBeGreaterThan(0);

  for (const amount of amounts) {
    expect(typeof amount).toBe('string');
    expect(amount).toMatch(EXACT_DECIMAL);
  }
});

test('an Account appears exactly once across the whole tree', async () => {
  const [report] = await buildReports(inChunks(accountsAcrossNestedCategories), template);

  const codes = (function codesIn(categories: readonly Category[]): string[] {
    return categories.flatMap((category) => [
      ...category.accounts.map((account) => account.code),
      ...codesIn(category.children),
    ]);
  })([...(report?.categories ?? []), ...(report ? [report.unmatched] : [])]);

  expect(codes).toHaveLength(new Set(codes).size);
});
