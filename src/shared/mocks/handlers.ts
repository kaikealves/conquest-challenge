import { http, HttpResponse } from 'msw';

import {
  reportUrl,
  templateIndexUrl,
  type ApiError,
  type Report,
  type ReportTemplateIndex,
} from '../../features/reporting/api/contract.ts';

/**
 * Handlers serving the contract in `features/reporting/api/contract.ts`.
 *
 * Per ADR-0007 these run in tests and development only; production fetches the
 * same URLs as static JSON the importer wrote. So these must answer with shapes
 * those files actually have — the Category labels below are the ones
 * `tools/importer/templates/french-chart.json` produces, not invented ones, or
 * every test written against them from ticket 11 onward would assert Categories
 * production never returns.
 */

const templates: ReportTemplateIndex = {
  templates: [
    { id: 'french-chart', name: 'French chart of accounts', periods: ['2015', '2016'] },
    { id: 'balance-sheet', name: 'Balance sheet', periods: ['2016'] },
  ],
};

/**
 * The Category labels are the ones `tools/importer/templates/french-chart.json`
 * produces — all three parents, so a test cannot pass while the application
 * silently drops one.
 *
 * The figures are invented. The sample ledger under `brief/` is a third party's
 * real accounting record, and a total taken from it is still their data, so
 * nothing here is derived from it. They are internally consistent — each parent
 * is the sum of its children — because the contract promises that and the tests
 * check it.
 */
function categoriesFor(scale: number): Report['categories'] {
  const at = (amount: number) => (amount * scale).toFixed(2);

  return [
    {
      label: 'Operating expenses',
      total: at(2350.5),
      accounts: [],
      children: [
        {
          label: 'Purchases',
          total: at(1200),
          children: [],
          accounts: [{ code: '601000', name: 'Achats stockés', total: at(1200) }],
        },
        {
          label: 'External services',
          total: at(850.5),
          children: [],
          accounts: [
            { code: '613200', name: 'Locations immobilières', total: at(700) },
            { code: '622600', name: 'Honoraires', total: at(150.5) },
          ],
        },
        {
          label: 'Taxes',
          total: at(300),
          children: [],
          accounts: [{ code: '635100', name: 'Impôts directs', total: at(300) }],
        },
        { label: 'Staff costs', total: at(0), children: [], accounts: [] },
        { label: 'Other operating expenses', total: at(0), children: [], accounts: [] },
      ],
    },
    {
      label: 'Operating income',
      total: at(-9125.25),
      accounts: [],
      children: [
        {
          label: 'Sales',
          total: at(-9000),
          children: [],
          accounts: [{ code: '706000', name: 'Prestations de services', total: at(-9000) }],
        },
        {
          label: 'Other income',
          total: at(-125.25),
          children: [],
          accounts: [{ code: '758000', name: 'Produits divers', total: at(-125.25) }],
        },
      ],
    },
    {
      label: 'Financial',
      total: at(375),
      accounts: [],
      children: [
        {
          label: 'Financial expenses',
          total: at(450),
          children: [],
          accounts: [{ code: '661100', name: 'Intérêts des emprunts', total: at(450) }],
        },
        {
          label: 'Financial income',
          total: at(-75),
          children: [],
          accounts: [{ code: '768000', name: 'Autres produits financiers', total: at(-75) }],
        },
      ],
    },
  ];
}

function reportFor(period: string, scale: number): Report {
  return {
    templateId: 'french-chart',
    templateName: 'French chart of accounts',
    period,
    currency: 'EUR',
    categories: categoriesFor(scale),
  };
}

/**
 * A second ReportTemplate, so a test can tell one Report from another by what
 * is on screen. Its Categories are invented, like every figure in this file.
 */
const balanceSheet: Report = {
  templateId: 'balance-sheet',
  templateName: 'Balance sheet',
  period: '2016',
  currency: 'EUR',
  categories: [
    {
      label: 'Assets',
      total: '5000.00',
      accounts: [{ code: '512000', name: 'Banque', total: '5000.00' }],
      children: [],
    },
    {
      label: 'Liabilities',
      total: '-5000.00',
      accounts: [{ code: '401000', name: 'Fournisseurs', total: '-5000.00' }],
      children: [],
    },
  ],
};

const reports = new Map<string, Report>([
  ['balance-sheet/2016', balanceSheet],
  ['french-chart/2016', reportFor('2016', 1)],
  ['french-chart/2015', reportFor('2015', 2)],
]);

/**
 * A Period reserved for forcing a server error.
 *
 * Static hosting returns 404 for a Report that does not exist but can never
 * return 500, so a test needing one uses this rather than a mechanism production
 * does not have. Making it a Period rather than a query flag means the client
 * needs no special code to reach it.
 */
export const PERIOD_THAT_FAILS = '0000';

export const handlers = [
  http.get(templateIndexUrl(), () => HttpResponse.json(templates)),

  http.get(reportUrl(':templateId', ':period'), ({ params }) => {
    const templateId = String(params.templateId);
    const period = String(params.period);

    if (period === PERIOD_THAT_FAILS) {
      return HttpResponse.json<ApiError>(
        { message: 'The Report could not be produced.' },
        { status: 500 },
      );
    }

    const report = reports.get(`${templateId}/${period}`);

    if (!report) {
      return HttpResponse.json<ApiError>(
        { message: `No Report for ReportTemplate ${templateId} in Period ${period}.` },
        { status: 404 },
      );
    }

    return HttpResponse.json(report);
  }),
];
