import { http, HttpResponse } from 'msw';

import {
  REPORT_URL_PATTERN,
  TEMPLATE_INDEX_URL_PATTERN,
  companiesUrl,
  type ApiError,
  type CompaniesIndex,
  type Report,
  type ReportTemplateIndex,
} from '../../features/reporting/api/contract.ts';

/**
 * Handlers serving the contract in `features/reporting/api/contract.ts`.
 *
 * Per ADR-0007 these run in tests and development only; production fetches the
 * same URLs as static JSON the importer wrote. So these must answer with shapes
 * those files actually have — the Category labels below are the ones
 * `tools/importer/templates/french-profit-and-loss.json` produces, not invented
 * ones, or every test written against them from ticket 11 onward would assert
 * Categories production never returns.
 *
 * Two Companies, so a test can exercise switching between them through
 * `renderApp()` without a per-test override — the same reason ticket 14 gave
 * for a second ReportTemplate.
 */

/** Invented, like every other figure in this file — not the real ledger's owner. */
const NORTHWIND = { id: 'northwind-freight', name: 'Northwind Freight Cooperative', country: 'FR' };
const RIVERSIDE = { id: 'riverside-textiles', name: 'Riverside Textiles', country: 'GB' };

const companies: CompaniesIndex = { companies: [NORTHWIND, RIVERSIDE] };

const northwindTemplates: ReportTemplateIndex = {
  company: NORTHWIND,
  templates: [
    { id: 'french-profit-and-loss', name: 'Profit and loss', periods: ['2015', '2016'] },
    { id: 'french-balance-sheet', name: 'Balance sheet', periods: ['2015', '2016'] },
  ],
};

const riversideTemplates: ReportTemplateIndex = {
  company: RIVERSIDE,
  templates: [{ id: 'uk-profit-and-loss', name: 'Profit and loss', periods: ['2016'] }],
};

const templatesByCompany = new Map<string, ReportTemplateIndex>([
  [NORTHWIND.id, northwindTemplates],
  [RIVERSIDE.id, riversideTemplates],
]);

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
    company: NORTHWIND,
    kind: 'ProfitAndLoss',
    unmatched: unmatchedFor(period, scale),
    // The top-level Categories net to -6389.75 at scale 1; 2015 adds its unmatched 40.
    total: ((-6389.75 + (period === '2015' ? 40 : 0)) * scale).toFixed(2),
    missingOpeningBalances: false,
    templateId: 'french-profit-and-loss',
    templateName: 'Profit and loss',
    period,
    currency: 'EUR',
    categories: categoriesFor(scale),
  };
}

/**
 * A second ReportTemplate under the same Company, so a test can tell one
 * Report from another by what is on screen. Its Categories are the ones
 * `french-balance-sheet.json` produces and its figures are invented; they net
 * to zero, as a BalanceSheet's do.
 */
const balanceSheetFor = (period: string): Report => ({
  company: NORTHWIND,
  kind: 'BalanceSheet',
  templateId: 'french-balance-sheet',
  templateName: 'Balance sheet',
  period,
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  total: '0.00',
  missingOpeningBalances: false,
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

/**
 * A different Company's Report, on a structurally different chart — a UK-style
 * convention (revenue starting with 4, not 7), not just a relabelling of
 * Northwind's numbers. Mirrors `tools/importer/templates/uk-profit-and-loss.json`.
 */
const riversideProfitAndLoss: Report = {
  company: RIVERSIDE,
  kind: 'ProfitAndLoss',
  templateId: 'uk-profit-and-loss',
  templateName: 'Profit and loss',
  period: '2016',
  currency: 'EUR',
  unmatched: { label: 'Unmatched', total: '0.00', children: [], accounts: [] },
  total: '-4060.00',
  missingOpeningBalances: false,
  categories: [
    {
      label: 'Turnover',
      total: '-8400.00',
      children: [],
      accounts: [{ code: '4000', name: 'Sales', total: '-8400.00' }],
    },
    {
      label: 'Cost of sales',
      total: '2800.00',
      children: [],
      accounts: [{ code: '5000', name: 'Materials purchased', total: '2800.00' }],
    },
    {
      label: 'Overheads',
      total: '1470.00',
      accounts: [],
      children: [
        {
          label: 'Premises costs',
          total: '1050.00',
          children: [],
          accounts: [{ code: '7100', name: 'Rent and rates', total: '1050.00' }],
        },
        {
          label: 'Motor and travel',
          total: '420.00',
          children: [],
          accounts: [{ code: '7400', name: 'Motor expenses', total: '420.00' }],
        },
      ],
    },
    {
      label: 'Finance costs',
      total: '70.00',
      children: [],
      accounts: [{ code: '8100', name: 'Bank interest', total: '70.00' }],
    },
  ],
};

const reports = new Map<string, Report>([
  [`${NORTHWIND.id}/french-balance-sheet/2016`, balanceSheetFor('2016')],
  [`${NORTHWIND.id}/french-balance-sheet/2015`, balanceSheetFor('2015')],
  [`${NORTHWIND.id}/french-profit-and-loss/2016`, reportFor('2016', 1)],
  [`${NORTHWIND.id}/french-profit-and-loss/2015`, reportFor('2015', 2)],
  [`${RIVERSIDE.id}/uk-profit-and-loss/2016`, riversideProfitAndLoss],
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
  http.get(companiesUrl(), () => HttpResponse.json(companies)),

  http.get(TEMPLATE_INDEX_URL_PATTERN, ({ params }) => {
    const index = templatesByCompany.get(String(params.companyId));

    if (!index) {
      return HttpResponse.json<ApiError>(
        { message: `No Company called ${String(params.companyId)}.` },
        { status: 404 },
      );
    }

    return HttpResponse.json(index);
  }),

  http.get(REPORT_URL_PATTERN, ({ params }) => {
    const companyId = String(params.companyId);
    const templateId = String(params.templateId);
    const period = String(params.period);

    if (period === PERIOD_THAT_FAILS) {
      return HttpResponse.json<ApiError>(
        { message: 'The Report could not be produced.' },
        { status: 500 },
      );
    }

    const report = reports.get(`${companyId}/${templateId}/${period}`);

    if (!report) {
      return HttpResponse.json<ApiError>(
        {
          message: `No Report for ReportTemplate ${templateId} in Period ${period} under Company ${companyId}.`,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(report);
  }),
];
