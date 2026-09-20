---
status: superseded by ADR-0007
---

# No backend in scope; MSW defines the API boundary

> **Superseded by [ADR-0007](./0007-static-json-is-the-api-not-msw.md).** The
> conclusion that no backend is built still holds. The claim that MSW is the API
> boundary in every environment does not: it rejected static JSON on reasoning
> that confused a bundled `import` with an HTTP `fetch`, and cost 158 kB gzipped
> in the production bundle to do it.

The brief asks for a Kotlin/Spring backend _and_ a React SPA, but grading weight
and a two-day budget both sit with the frontend. We define the REST contract as
MSW handlers and implement no server, so the frontend is genuinely asynchronous
and fully testable while the backend remains a design deliverable argued in the
dossier rather than a half-finished service.

## Considered Options

- **A real Spring service** — rejected: no JDK, Kotlin or Gradle is installed
  locally, so this starts with toolchain setup before any code, and a rushed
  service would demonstrate less than a well-argued design.
- **Static JSON imports** — rejected: nothing would be genuinely asynchronous, so
  loading and error states would be theatre rather than behaviour.

## Consequences

- The handlers are the API contract, satisfying that deliverable directly.
- The same handlers serve the browser, Vitest and Playwright.
- A real backend becomes a base-URL change, not a rewrite.
