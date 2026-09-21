# 11: Report fetched and rendered

**What to build:** A Report appears on screen. It is fetched over HTTP through TanStack Query per ADR-0005 and rendered as a flat list of Categories with their totals — the first thing a user can actually look at.

**Blocked by:** 10 (Mock API contract).

**Status:** resolved

- [x] TanStack Query owns the server state; no data fetching in effects
- [x] Categories render with correct labels and totals
- [x] Amounts are formatted consistently with their currency
- [x] Debit and credit are distinguishable at a glance
- [x] Component and type names use the vocabulary from the Reporting glossary
- [x] A component test asserts the rendered totals match the fixture

## Comments

The first thing a user can look at. `ReportScreen` asks `useReport` for a Report,
`ReportView` renders its Categories, `CategoryRow` renders one line. Names come
from the Reporting glossary, and the components take a Category rather than a
label and a total, so ticket 13's recursion has somewhere to go.

TanStack Query owns the server state per ADR-0005. There is no `useEffect`
fetching anywhere, so caching, deduplication of concurrent requests for the same
Report, and the loading and error states come from one place. The query key is
the ReportTemplate and the Period, which is what will stop ticket 15's Period
switch showing a stale Report.

**Amounts are formatted from the decimal string, never through `Number`.**
`Intl.NumberFormat` accepts a string, and it matters:
`format('90071992547409.93')` gives 90,071,992,547,409.93 while
`format(Number(...))` gives .94. A figure computed exactly all the way from the
ledger would have been displayed a cent wrong at the last step. `lib` moved to
ES2023 for the typing, and the string is validated before being narrowed rather
than cast on faith.

**A credit is shown in parentheses and in a different colour**, as an accounting
report is read, rather than with a minus sign. Revenue carries a credit balance,
so Operating income reads `(EUR 783,315.09)`. Two signals rather than one:
colour alone excludes anyone who cannot distinguish it, and parentheses survive
a printout and a screen reader.

The ReportTemplate and Period are fixed at `french-chart` / `2016`; tickets 14
and 15 put them in the URL. Loading and error states are deliberately plain —
ticket 12 owns making them good, including retry without a page reload.

### A detour worth recording

The Report renders correctly in Chromium but appears stuck on "Loading" in the
Claude browser pane, which does not support service workers, so MSW cannot
intercept there. Time went into moving the mock worker out of `public/` and
serving it from middleware, on the theory that the middleware was at fault. It
was not — and serving a worker from middleware satisfies `curl` but not a real
registration, which fetches the script under stricter rules. The worker is back
in `public/` where it works, and a build plugin removes it from `dist` instead,
so the deployed site still carries no mock. `e2e/report-api.spec.ts` holds that
true.
