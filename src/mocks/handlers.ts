import { http, HttpResponse } from 'msw';

/**
 * The API contract, as mock handlers. Per ADR-0003 these handlers *are* the
 * specification a real backend would satisfy — they are not a test double for a
 * service that exists elsewhere.
 *
 * Ticket 10 defines the Report and ReportTemplate endpoints. This one exists so
 * the harness has something to intercept, in the browser and in Node, from the
 * same array.
 */
export const handlers = [http.get('/api/health', () => HttpResponse.json({ status: 'ok' }))];
