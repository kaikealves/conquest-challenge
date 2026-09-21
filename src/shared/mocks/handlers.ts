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
  templates: [{ id: 'french-chart', name: 'French chart of accounts', periods: ['2015', '2016'] }],
};

const frenchChart2016: Report = {
  templateId: 'french-chart',
  templateName: 'French chart of accounts',
  period: '2016',
  currency: 'EUR',
  categories: [
    {
      label: 'Operating expenses',
      total: '182433.83',
      accounts: [],
      children: [
        {
          label: 'Purchases',
          total: '78184.75',
          children: [],
          accounts: [
            { code: '601000', name: 'Achats stockés', total: '78000.00' },
            { code: '606100', name: 'Fournitures non stockables', total: '184.75' },
          ],
        },
        {
          label: 'External services',
          total: '58885.08',
          children: [],
          accounts: [
            { code: '613200', name: 'Locations immobilières', total: '58000.00' },
            { code: '622600', name: 'Honoraires', total: '885.08' },
          ],
        },
        {
          label: 'Taxes',
          total: '45364.00',
          children: [],
          accounts: [{ code: '635100', name: 'Impôts directs', total: '45364.00' }],
        },
        { label: 'Staff costs', total: '0.00', children: [], accounts: [] },
        { label: 'Other operating expenses', total: '0.00', children: [], accounts: [] },
      ],
    },
    {
      label: 'Operating income',
      total: '-783315.09',
      accounts: [],
      children: [
        {
          label: 'Sales',
          total: '-783315.06',
          children: [],
          accounts: [{ code: '706000', name: 'Prestations de services', total: '-783315.06' }],
        },
        {
          label: 'Other income',
          total: '-0.03',
          children: [],
          accounts: [{ code: '758000', name: 'Produits divers', total: '-0.03' }],
        },
      ],
    },
  ],
};

const reports = new Map<string, Report>([
  ['french-chart/2016', frenchChart2016],
  ['french-chart/2015', { ...frenchChart2016, period: '2015', categories: [] }],
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
