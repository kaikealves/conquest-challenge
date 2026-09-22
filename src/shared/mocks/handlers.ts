import { http, HttpResponse } from 'msw';

import {
  REPORT_URL_PATTERN,
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
 * `tools/importer/templates/french-profit-and-loss.json` produces, not invented ones, or
 * every test written against them from ticket 11 onward would assert Categories
 * production never returns.
 */

/** Invented, like every other figure in this file — not the real ledger's owner. */
const COMPANY = { name: 'Northwind Freight Cooperative' };

const templates: ReportTemplateIndex = {
  company: COMPANY,
  templates: [
    { id: 'french-profit-and-loss', name: 'Profit and loss', periods: ['2015', '2016'] },
    { id: 'french-balance-sheet', name: 'Balance sheet', periods: ['2015', '2016'] },
  ],
};

/**
 * The Category labels are the ones `tools/importer/templates/french-profit-and-loss.json`
 * produces — every parent, so a test cannot pass while the application
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
        { label: 'Depreciation and provisions', total: at(0), children: [], accounts: [] },
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
    {
      label: 'Exceptional',
      total: at(10),
      accounts: [],
      children: [
        {
          label: 'Exceptional expenses',
          total: at(10),
          children: [],
          accounts: [{ code: '671000', name: 'Charges exceptionnelles', total: at(10) }],
        },
        { label: 'Exceptional income', total: at(0), children: [], accounts: [] },
      ],
    },
    { label: 'Income tax', total: at(0), children: [], accounts: [] },
  ];
}

/**
 * A period with an incomplete template shows one Account in the unmatched group;
 * the others show it empty, as a complete template does. 2015's is the one, so a
 * test can see both.
 */
function unmatchedFor(period: string, scale: number): Report['unmatched'] {
  const total = (40 * scale).toFixed(2);

  return period === '2015'
    ? {
        label: 'Unmatched',
        total,
        children: [],
        accounts: [{ code: '471000', name: 'Compte d’attente', total }],
      }
    : { label: 'Unmatched', total: '0.00', children: [], accounts: [] };
}

function reportFor(period: string, scale: number): Report {
  return {
    company: COMPANY,
    unmatched: unmatchedFor(period, scale),
    templateId: 'french-profit-and-loss',
    templateName: 'Profit and loss',
    period,
    currency: 'EUR',
    categories: categoriesFor(scale),
  };
}

/**
 * A second ReportTemplate, so a test can tell one Report from another by what
 * is on screen. Its Categories are the ones `french-balance-sheet.json` produces
 * and its figures are invented; they net to zero, as a BalanceSheet's do.
 */
const balanceSheetFor = (period: string): Report => ({
  company: COMPANY,
  templateId: 'french-balance-sheet',
  templateName: 'Balance sheet',
  period,
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  categories: [
    {
      label: 'Assets',
      total: '5000.00',
      accounts: [],
      children: [
        {
          label: 'Cash and banks',
          total: '5000.00',
          children: [],
          accounts: [{ code: '512000', name: 'Banque', total: '5000.00' }],
        },
      ],
    },
    {
      label: 'Equity and liabilities',
      total: '-4000.00',
      accounts: [],
      children: [
        {
          label: 'Suppliers',
          total: '-4000.00',
          children: [],
          accounts: [{ code: '401000', name: 'Fournisseurs', total: '-4000.00' }],
        },
      ],
    },
    {
      label: 'Result',
      total: '-1000.00',
      children: [],
      accounts: [{ code: '706000', name: 'Prestations de services', total: '-1000.00' }],
    },
  ],
});

const reports = new Map<string, Report>([
  ['french-balance-sheet/2016', balanceSheetFor('2016')],
  ['french-balance-sheet/2015', balanceSheetFor('2015')],
  ['french-profit-and-loss/2016', reportFor('2016', 1)],
  ['french-profit-and-loss/2015', reportFor('2015', 2)],
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

  http.get(REPORT_URL_PATTERN, ({ params }) => {
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
