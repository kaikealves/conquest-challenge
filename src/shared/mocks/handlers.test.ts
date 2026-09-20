import { expect, test } from 'vitest';

import {
  reportUrl,
  templateIndexUrl,
  type ApiError,
  type Report,
  type TemplateIndex,
} from '../../features/reporting/api/contract.ts';
import { PERIOD_THAT_FAILS } from './handlers.ts';

/**
 * These protect the API contract the application codes against, not MSW itself.
 *
 * Handlers declare same-origin paths, so a caller resolves them against the
 * document origin as the application will; an absolute URL to another host
 * misses the handler and fails as unhandled.
 */
function get(path: string): Promise<Response> {
  return fetch(new URL(path, window.location.origin));
}

test('the index lists each ReportTemplate with the Periods it has Reports for', async () => {
  const response = await get(templateIndexUrl());
  const body = (await response.json()) as TemplateIndex;

  expect(response.status).toBe(200);
  expect(body.templates.map((template) => template.id)).toEqual(['french-chart', 'uk-chart']);
  expect(body.templates[0]?.periods).toEqual(['2015', '2016']);
});

test('a Report carries its Categories, their children and the Accounts within them', async () => {
  const response = await get(reportUrl('french-chart', '2016'));
  const report = (await response.json()) as Report;

  expect(response.status).toBe(200);

  const [operating] = report.categories;
  expect(operating?.label).toBe('Operating expenses');
  expect(operating?.total).toBe('500.50');
  expect(operating?.children.map((child) => child.label)).toEqual(['Purchases', 'Staff costs']);
  expect(operating?.children[0]?.accounts[0]).toEqual({
    code: '606100',
    name: 'Fournitures',
    total: '100.00',
  });
});

test('a ReportTemplate is addressed by its slug, not its display name', async () => {
  expect((await get(reportUrl('french-chart', '2016'))).status).toBe(200);
  expect((await get(reportUrl('French chart of accounts', '2016'))).status).toBe(404);
});

test('a Report that does not exist answers 404 with a reason', async () => {
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
