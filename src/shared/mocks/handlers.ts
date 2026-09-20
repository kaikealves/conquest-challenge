import { http, HttpResponse } from 'msw';

import {
  reportUrl,
  templateIndexUrl,
  type ApiError,
  type Report,
  type TemplateIndex,
} from '../../features/reporting/api/contract.ts';

/**
 * Handlers serving the contract in `features/reporting/api/contract.ts`.
 *
 * Per ADR-0007 these run in tests and development only. Production fetches the
 * same URLs as static JSON the importer wrote, so these must answer with the
 * shape those files have: the contract test keeps the importer honest, and these
 * keep the tests honest.
 */

const templates: TemplateIndex = {
  templates: [
    { id: 'french-chart', name: 'French chart of accounts', periods: ['2015', '2016'] },
    { id: 'uk-chart', name: 'UK chart of accounts', periods: ['2016'] },
  ],
};

const frenchChart2016: Report = {
  templateId: 'french-chart',
  templateName: 'French chart of accounts',
  period: '2016',
  currency: 'EUR',
  categories: [
    {
      label: 'Operating expenses',
      total: '500.50',
      accounts: [],
      children: [
        {
          label: 'Purchases',
          total: '125.00',
          children: [],
          accounts: [
            { code: '606100', name: 'Fournitures', total: '100.00' },
            { code: '613200', name: 'Locations', total: '25.00' },
          ],
        },
        {
          label: 'Staff costs',
          total: '375.50',
          children: [],
          accounts: [
            { code: '641000', name: 'Salaires', total: '300.00' },
            { code: '645000', name: 'Charges sociales', total: '75.50' },
          ],
        },
      ],
    },
    {
      label: 'Operating income',
      total: '-900.00',
      children: [],
      accounts: [{ code: '701000', name: 'Ventes', total: '-900.00' }],
    },
  ],
};

const reports = new Map<string, Report>([
  ['french-chart/2016', frenchChart2016],
  ['french-chart/2015', { ...frenchChart2016, period: '2015', categories: [] }],
  [
    'uk-chart/2016',
    {
      templateId: 'uk-chart',
      templateName: 'UK chart of accounts',
      period: '2016',
      currency: 'EUR',
      categories: [
        { label: 'Administrative expenses', total: '42.00', children: [], accounts: [] },
      ],
    },
  ],
]);

/**
 * A Period reserved for forcing a server error.
 *
 * Static hosting returns 404 for a Report that does not exist but can never
 * return 500, so a test needing one uses this rather than a mechanism production
 * does not have. Keeping it a Period rather than a query flag means the client
 * needs no special code to reach it.
 */
export const PERIOD_THAT_FAILS = '0000';

function notFound(message: string): HttpResponse<ApiError> {
  return HttpResponse.json<ApiError>({ message }, { status: 404 });
}

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
      return notFound(`No Report for ReportTemplate ${templateId} in Period ${period}.`);
    }

    return HttpResponse.json(report);
  }),
];
