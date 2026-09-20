---
status: accepted
supersedes: ADR-0003
---

# Static JSON is the API; MSW is for tests

The importer writes `public/data/templates.json` and
`public/data/reports/{template}/{period}.json`. The deployed application fetches
those URLs over HTTP. MSW is kept for tests and local development, where forcing
a 500 is useful, but is no longer part of the production bundle.

This supersedes [ADR-0003](./0003-no-backend-msw-is-the-api-boundary.md), which
made MSW handlers the API contract in every environment. No backend is still
implemented, and the REST contract is still a deliverable — it is now expressed
as the URL shape and payload schema the static files satisfy.

## Considered Options

ADR-0003 rejected "static JSON imports" on the grounds that "nothing would be
genuinely asynchronous, so loading and error states would be theatre rather than
behaviour". That reasoning conflated a bundled `import` with an HTTP `fetch`.
Fetching a static file is genuinely asynchronous: real network, real latency,
real failure. The option was ruled out without being evaluated.

Its cost was concrete. MSW's browser build is 420 kB raw and 158 kB gzipped —
larger than React — and it sat on the critical path, since rendering waited for
the worker to start. That is a high price to fake something static hosting does
honestly.

## Consequences

- A request for a Report that does not exist returns a real 404 from the host, so
  the error and retry states are driven by a genuine failure rather than a
  simulated one. This is also what makes a stale shared link diagnosable.
- Swapping in a real backend is a base-URL change, as before.
- Pre-computing every Report means one file per template and Period. At five
  fiscal years and a handful of templates that is around a dozen small files; at
  a scale where it is not, the resolution is the backend this design describes.
- The deployed site serves a synthetic ledger. The sample data is a third party's
  real accounting record, and publishing figures derived from it is not
  acceptable, so the committed fixture is shaped like the real chart of accounts
  with invented figures. It doubles as evidence that a second Chart of Accounts
  needs no code change.
