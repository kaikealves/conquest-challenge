import { http, HttpResponse } from 'msw';

/**
 * Mock handlers, shared by every environment: the browser via `browser.ts`, and
 * Vitest via `node.ts`. Per ADR-0003 these are the specification a real backend
 * would satisfy, not a test double standing in for a service that exists
 * elsewhere.
 *
 * Ticket 10 defines the real contract — the Report and ReportTemplate
 * endpoints, their error codes and a reachable failure case. This single path
 * exists only so the harness has something to intercept from one array, proving
 * both entry points are wired to the same source.
 */
export const handlers = [http.get('/api/health', () => HttpResponse.json({ status: 'ok' }))];
