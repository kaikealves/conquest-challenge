# 16: External API component

**What to build:** A component fetching from an external mock API the application does not control, demonstrating asynchronous data handling against a third-party service. Explicitly requested by the brief, and off the critical path.

**Blocked by:** 02 (Test harness).

**Status:** ready-for-agent

- [ ] A component fetches from a public mock API and displays the data
- [ ] Loading, error and empty states are each visible and tested
- [ ] Data fetching goes through TanStack Query, consistent with ADR-0005
- [ ] The component lives on its own route
- [ ] Types describe the external payload at the boundary rather than leaking through the component
