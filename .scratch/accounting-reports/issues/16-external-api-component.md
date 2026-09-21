# 16: External API component

**What to build:** A component fetching from an external mock API the application does not control, demonstrating asynchronous data handling against a third-party service. Explicitly requested by the brief, and off the critical path.

**Blocked by:** 02 (Test harness).

**Status:** wontfix

- [ ] A component fetches from a public mock API and displays the data
- [ ] Loading, error and empty states are each visible and tested
- [ ] Data fetching goes through TanStack Query, consistent with ADR-0005
- [ ] The component lives on its own route
- [ ] Types describe the external payload at the boundary rather than leaking through the component

## Decision: not building a separate component

2026-09-22. The brief's line is _"Build a React component using TypeScript that fetches data from a mock API (e.g. JSONPlaceholder), manages loading/error states, and displays the data."_ JSONPlaceholder is an example, not a requirement. The Report screen is that component: typed, fetching through TanStack Query from a mock API (MSW in development and tests, static JSON in production, per ADR-0007), with loading, error, retry and empty states, all tested (tickets 11 and 12).

The phrase "a service this application does not control" in this ticket and in spec story 38 was the spec's own addition, not the brief's. A page of unrelated todos or posts would show nothing the Report screen does not, and would be code with no purpose in a finance application.

**Risk accepted:** an evaluator who reads "JSONPlaceholder" literally may look for it. Ticket 21 (README) and the dossier say plainly which component satisfies the bullet and why the mock API is MSW. If that risk is judged too high, reviving this ticket is about an hour: a route, a `useQuery` against `jsonplaceholder.typicode.com`, and three states.
