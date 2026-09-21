import { expect, test } from 'vitest';

import {
  reportUrl,
  templateIndexUrl,
  type ApiError,
  type Category,
  type Report,
  type ReportTemplateIndex,
} from '../../features/reporting/api/contract.ts';
import { PERIOD_THAT_FAILS } from './handlers.ts';

/**
 * These protect the API contract, not MSW and not the fixture's figures.
 *
 * Asserting a total here against a number this module also defines proves
 * nothing — the assertion and the value would be twenty lines apart and could
 * never disagree for a domain reason. So these check what a client can rely on:
 * status codes, error shape, URL semantics, and the structural invariants the
 * payload promises. The figures are the importer's business, checked at Seam 1;
 * rendering is checked against the running application from ticket 11.
 */
function get(path: string): Promise<Response> {
  return fetch(new URL(path, window.location.origin));
}

const EXACT_DECIMAL = /^-?\d+\.\d{2}$/;

function sumOfParts(category: Category): number {
  const parts = [
    ...category.children.map((child) => Number(child.total)),
    ...category.accounts.map((account) => Number(account.total)),
  ];

  return Number(parts.reduce((running, part) => running + part, 0).toFixed(2));
}

function everyCategory(categories: readonly Category[]): Category[] {
  return categories.flatMap((category) => [category, ...everyCategory(category.children)]);
}

test('the index lists each ReportTemplate with the Periods it has Reports for', async () => {
  const response = await get(templateIndexUrl());
  const body = (await response.json()) as ReportTemplateIndex;

  expect(response.status).toBe(200);
  expect(body.templates.length).toBeGreaterThan(0);

  for (const template of body.templates) {
    expect(template.id).not.toBe('');
    expect(template.periods.length).toBeGreaterThan(0);
    // Every advertised Period must actually resolve, or the index is a promise
    // the API does not keep.
    for (const period of template.periods) {
      expect((await get(reportUrl(template.id, period))).status).toBe(200);
    }
  }
});

test('a Report carries its Categories, their children and the Accounts within them', async () => {
  const report = (await (await get(reportUrl('french-chart', '2016'))).json()) as Report;
  const categories = everyCategory(report.categories);

  expect(categories.length).toBeGreaterThan(report.categories.length);
  expect(categories.some((category) => category.accounts.length > 0)).toBe(true);

  for (const category of categories) {
    expect(category.label).not.toBe('');
    expect(category.total).toMatch(EXACT_DECIMAL);

    for (const account of category.accounts) {
      expect(account.code).not.toBe('');
      expect(account.total).toMatch(EXACT_DECIMAL);
    }
  }
});

test("a Category's total is its children plus the Accounts it holds directly", async () => {
  const report = (await (await get(reportUrl('french-chart', '2016'))).json()) as Report;

  for (const category of everyCategory(report.categories)) {
    if (category.children.length === 0 && category.accounts.length === 0) continue;

    expect(Number(category.total)).toBe(sumOfParts(category));
  }
});

test('an Account appears exactly once across the whole Report', async () => {
  const report = (await (await get(reportUrl('french-chart', '2016'))).json()) as Report;
  const codes = everyCategory(report.categories).flatMap((category) =>
    category.accounts.map((account) => account.code),
  );

  expect(codes).toHaveLength(new Set(codes).size);
});

test('a ReportTemplate is addressed by its slug, not its display name', async () => {
  expect((await get(reportUrl('french-chart', '2016'))).status).toBe(200);
  expect((await get(reportUrl('French chart of accounts', '2016'))).status).toBe(404);
});

test('a Report that does not exist answers 404 with a reason naming what was asked for', async () => {
  const response = await get(reportUrl('french-chart', '1066'));

  expect(response.status).toBe(404);
  expect(((await response.json()) as ApiError).message).toContain('1066');
});

test('an unknown ReportTemplate answers 404 rather than an empty Report', async () => {
  expect((await get(reportUrl('no-such-template', '2016'))).status).toBe(404);
});

test('a Report that cannot be produced answers 500, so retry has something to retry', async () => {
  const response = await get(reportUrl('french-chart', PERIOD_THAT_FAILS));

  expect(response.status).toBe(500);
  expect(((await response.json()) as ApiError).message).not.toBe('');
});
