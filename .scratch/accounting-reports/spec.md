# Spec: Accounting Reports

Status: ready-for-agent

## Problem Statement

A finance team receives accounting data from several external accounting systems,
each speaking its own format and vocabulary. The raw data is a flat general
ledger — tens of thousands of Entries with no structure beyond account codes —
which nobody can read. To answer "what did we earn last year" or "does the
balance sheet balance", someone currently has to open a spreadsheet and aggregate
by hand, re-deriving the same groupings every time, and re-doing the work from
scratch whenever the Chart of Accounts differs between countries.

There is no way to define a report shape once and apply it repeatedly, and no way
to see the result without trusting a manual process.

## Solution

An application that imports accounting data from a Provider, holds it as balanced
Transactions, and presents summarised Reports — a BalanceSheet and a
ProfitAndLoss — aggregated into Categories defined by a ReportTemplate.

The user picks a ReportTemplate and a Period, and sees a hierarchical Report they
can expand from Category down to individual Account. The Report can be exported
to Excel. Because a ReportTemplate defines its Categories as CategoryRoots over a
Chart of Accounts, the same application serves a French chart and a UK chart
without code changes.

The correctness the user cares about is visible rather than asserted: a
BalanceSheet states that assets equal liabilities, and the Result reconciles it
to the ProfitAndLoss.

## User Stories

### Viewing reports

1. As a finance user, I want to see a ProfitAndLoss for a Period, so that I can understand what the business earned and spent.
2. As a finance user, I want to see a BalanceSheet at a point in time, so that I can understand what the business owns and owes.
3. As a finance user, I want the BalanceSheet to show that assets equal liabilities, so that I can trust the numbers without re-checking them.
4. As a finance user, I want to see the Result stated explicitly, so that I can see how the ProfitAndLoss reconciles to the BalanceSheet.
5. As a finance user, I want each Category shown as a single labelled line with its total, so that I can read the Report without wading through individual Accounts.
6. As a finance user, I want to expand a Category to see the Accounts inside it, so that I can investigate a figure that looks wrong.
7. As a finance user, I want to expand nested Categories to arbitrary depth, so that a deep Chart of Accounts hierarchy is navigable rather than flattened.
8. As a finance user, I want Accounts shown with both their AccountCode and their name, so that I can cross-reference against my accounting system.
9. As a finance user, I want debit and credit amounts distinguishable at a glance, so that I can spot a sign error.
10. As a finance user, I want amounts formatted consistently with their currency, so that I am not misreading magnitudes.

### Choosing what to see

11. As a finance user, I want to choose which ReportTemplate to apply, so that I can view the same data under different Chart of Accounts mappings.
12. As a finance user, I want to choose the Period a Report covers, so that I can compare one FiscalYear against another.
13. As a finance user, I want the chosen ReportTemplate and Period reflected in the URL, so that I can bookmark a Report or send it to a colleague.
14. As a finance user, I want opening a shared Report URL to show exactly what the sender saw, so that we are discussing the same numbers.
15. As a finance user, I want an invalid or unknown ReportTemplate in a URL to produce a clear message rather than a blank screen, so that a stale link is diagnosable.

### Correctness the user can rely on

16. As a finance user, I want OpeningBalance Entries included in a BalanceSheet, so that balances carried forward from previous FiscalYears are reflected.
17. As a finance user, I want OpeningBalance Entries excluded from a ProfitAndLoss, so that each FiscalYear's Result reflects only that year's activity.
18. As a finance user, I want Entries posted to an AuxiliaryAccount to appear under its ControlAccount, so that a Report shows "Customers" rather than one line per customer.
19. As a finance user, I want an Account to appear in exactly one Category, so that no amount is double-counted across a Report.
20. As a finance user, I want Accounts matched to Categories correctly regardless of how long their AccountCode is, so that unusually short or long codes are not silently dropped.
21. As a finance user, I want Accounts matched by no Category surfaced rather than hidden, so that an incomplete ReportTemplate is visible instead of quietly losing money.

### Data import

22. As a finance user, I want accounting data imported from a Provider, so that I do not re-key it by hand.
23. As a finance user, I want a Transaction whose Entries do not sum to zero rejected, so that corrupt accounting data never reaches a Report.
24. As a finance user, I want rejected Transactions reported with a reason, so that I can go back to the Provider with something specific.
25. As a finance user, I want re-running an import not to duplicate data, so that a retry after a failure is safe.
26. As a developer, I want Provider vocabulary translated at the boundary, so that adding a second Provider does not touch reporting code.
27. As a developer, I want the import to stream rather than load the whole payload, so that thirty years of accounting data does not exhaust memory.

### Asynchronous behaviour

28. As a finance user, I want a loading indicator while a Report is being fetched, so that I know the application is working rather than broken.
29. As a finance user, I want a clear error message when a Report fails to load, so that I know to retry rather than assume there is no data.
30. As a finance user, I want to retry a failed request without reloading the page, so that a transient failure is not disruptive.
31. As a finance user, I want previously viewed Reports to appear instantly when I return to them, so that navigating back and forth is not punishing.
32. As a finance user, I want changing the Period not to show a stale Report from the previous Period, so that I never read the wrong numbers.
33. As a developer, I want concurrent requests for the same Report deduplicated, so that the same data is not fetched several times over.

### Export

34. As a finance user, I want to export the current Report to Excel, so that I can share it with people who do not use this application.
35. As a finance user, I want the exported file to preserve the Category hierarchy, so that the structure survives the export.
36. As a finance user, I want exported amounts to be real numbers rather than formatted text, so that I can compute with them in the spreadsheet.
37. As a finance user, I want the export to reflect the Period and ReportTemplate currently shown, so that the file matches what I was looking at.

### Demonstration of external API integration

38. As an evaluator, I want to see a component fetching from an external mock API, so that I can assess how asynchronous data is handled against a service this application does not control.
39. As an evaluator, I want that component's loading, error and empty states visible, so that I can assess edge-case handling rather than only the happy path.

### Engineering quality

40. As a developer, I want the domain vocabulary used in component and type names, so that code and conversation use the same words.
41. As a developer, I want each bounded context in its own directory, so that a change to reporting does not require understanding the importer.
42. As a developer, I want linting, type-checking and tests run automatically on every push, so that a regression is caught before review.
43. As a developer, I want the API contract defined explicitly, so that a real backend has a specification to satisfy.
44. As a developer, I want to swap the mock API for a real backend by changing a base URL, so that the backend is a drop-in rather than a rewrite.
45. As an evaluator, I want to clone the repository and run the application without additional setup, so that I can assess it immediately.

## Implementation Decisions

### Architecture

- Two bounded contexts, **Ledger** and **Reporting**, per ADR-0001. Ledger lives
  in `tools/importer/` and Reporting is split between the importer's aggregation
  and the application's presentation, per ADR-0006.
- The importer is an **anti-corruption layer** per ADR-0002. Provider vocabulary
  terminates there; no provider term appears in the domain model.
- **No backend is implemented.** The importer stands in for it at build time and
  writes the JSON the application fetches; the REST contract is that URL shape
  and payload schema, per ADR-0007. The Kotlin/Spring design is delivered as
  prose in the dossier.
- **All accounting logic lives in `tools/importer/`, outside the application**,
  per ADR-0006. `src/` is the React application and holds no domain model.
- **Feature-first source layout** within the application, per ADR-0004.
- **TanStack Query owns all server state** per ADR-0005.

### Ledger context

- `Transaction` is the aggregate root and owns the zero-sum invariant. Entries
  cannot be created except through it.
- `AccountCode` and `Money` are value objects. `AccountCode` carries the
  prefix-matching and auxiliary-detection behaviour rather than exposing string
  operations to callers — this is what makes variable-length codes safe.
- `Money` is decimal-based. Floating point is prohibited for amounts.
- Auxiliary detection and ControlAccount resolution happen in the Ledger context;
  the rollup itself is the translation applied when Entries cross into Reporting.
- Transactions failing the zero-sum check are quarantined with a reason, not
  discarded silently.

### Reporting context

- A `ReportTemplate` is an ordered set of `Category` items; each `Category`
  declares one or more `CategoryRoot` values and may nest.
- Templates are defined as data, not code, so a second Chart of Accounts requires
  no code change.
- An Account matches at most one Category. Where several CategoryRoots could
  match, the most specific (longest) wins.
- Accounts matched by no Category are collected into an explicit unmatched group
  rather than dropped.
- `ProfitAndLoss` excludes OpeningBalance Entries; `BalanceSheet` includes them.
- `Result` is computed as revenue less expenses and is the reconciling figure
  between the two Reports.

### Import pipeline

- The importer runs as a **build-time script**, not in the browser. It reads the
  Provider payload and emits Report JSON consumed by the mock API.
- Parsing is streaming, not document-based.
- Entries are keyed on the Provider's own stable identifier, so re-running the
  import is idempotent.

### API contract

- Endpoints expose Reports, not raw Entries. The client never receives the
  general ledger.
- A Report response carries its Categories, their totals, their nested children
  and the Accounts within them, already aggregated.
- Template listing is a separate endpoint from Report retrieval.
- Errors use standard HTTP status codes with a message body; the client
  distinguishes "no data for this Period" from "the request failed".

### Frontend

- Routing carries ReportTemplate and Period, so Report URLs are shareable.
- The hierarchical Report is a hand-rolled recursive component rather than a
  table library, since hierarchy and composition are the capabilities being
  demonstrated. The dossier records when a table library would be the right call.
- Memoization is applied deliberately: the Category tree aggregation is memoized
  because it is real CPU work, and Report rows are memoized to stop a sibling
  expansion re-rendering the tree. It is not applied by reflex elsewhere.
- Excel export runs client-side from the Report already in memory.

## Testing Decisions

### What makes a good test here

Tests assert **external behaviour at the highest available seam**. They do not
reach into intermediate representations, do not assert on internal function
calls, and do not test value objects in isolation where the behaviour is
observable through the pipeline. A test is named for the domain rule it protects,
not the function it calls.

### Seam 1 — the pipeline: Provider payload in, Report out

One entry point covering both bounded contexts. The intermediate domain model is
an implementation detail and is not asserted on directly.

Fixtures are small and purpose-built, each named for the case it covers. The
supplied sample ledger is **not** used as a fixture: it is too large to make
failures legible, and it is not committed.

Rules protected at this seam:

- a Transaction whose Entries do not sum to zero is rejected, with a reason
- an Entry posted to an AuxiliaryAccount appears under its ControlAccount
- OpeningBalance Entries appear in a BalanceSheet
- OpeningBalance Entries are absent from a ProfitAndLoss
- CategoryRoot matching is correct for AccountCodes of unusual length, short and long
- the most specific CategoryRoot wins where several match
- an Account matched by no Category appears in the unmatched group
- assets equal liabilities once Result is included
- re-running the import produces no duplicates

### Seam 2 — the application rendered against the mock API

Component tests and end-to-end tests drive the real application against the real
mock handlers. Same seam, two depths of zoom: component tests cover a single
view's behaviour, end-to-end tests cover a user's path across views.

Rules protected at this seam:

- a Report renders its Categories with correct totals
- expanding a Category reveals its Accounts
- a loading state is shown while a Report is in flight
- an error state is shown when a request fails, with a working retry
- changing the Period does not display the previous Period's Report
- a shared Report URL reproduces the sender's view
- an unknown ReportTemplate produces a message, not a blank screen
- the external-API component shows loading, error and empty states
- exporting produces a file reflecting the current Report

### Prior art

None — this is a new repository. These tests establish the conventions, so their
naming and structure should be treated as the pattern for later work.

## Out of Scope

- **The Kotlin/Spring backend.** Designed and argued in the dossier, not built.
  Revisited only if the frontend finishes early.
- **A ReportTemplate management UI.** Templates are defined as data; CRUD over
  them is designed, not built.
- **Live Provider integration.** The importer consumes a saved payload; no
  scheduled job, connector registry or import-status UI is built.
- **Authentication, authorisation and multi-tenancy.** Named in the design as
  required at the stated scale, not implemented.
- **Multi-currency.** The sample data is single-currency. `Money` carries its
  currency so the model does not preclude it, but no conversion is implemented.
- **Persistence.** No database. Report JSON is produced at build time.
- **Comparative reporting** — period-over-period columns, variance, drill-through
  to source Transactions.

## Further Notes

### Delivery priority

The ordering principle is that **a running Report beats a complete backlog**.
Anything cut comes off the end, and the end is deliberately composed of items
that are easy to explain away.

Roughly: scaffold and CI first, then the pipeline, then the mock API contract,
then the Report UI, then the external-API component, then export, then the
dossier, then deployment last.

A deliberate block is reserved for studying the domain-driven design and
accounting material before the interview. It is not build time and should not be
consumed by build overrun.

### The dossier is a deliverable

The brief asks three times for reasoning, not just code: argue the architectural
choices, identify performance issues and solutions, explain the optimisation
strategy. The ADRs already in `docs/adr/` are the raw material. This is the
cheapest scoring opportunity in the exercise and must not be squeezed out.

### Performance argument

The sample Provider response reports a **12-second server-side duration for one
company's 6,774 Entries**. At the stated scale — thousands of companies, thirty
years of data — the import path, not reporting, is the bottleneck. The design
should carry that claim and its consequences: pre-aggregated period balances so a
long Report reads few rows rather than millions; immutability of closed
FiscalYears making them aggressively cacheable; partitioning by company and
FiscalYear; imports parallel across companies and sequential within one.

### Known uncertainty

Three journal codes in the sample data (`SIT`, `SIE`, `INV`) could not be
confidently expanded. Their contents identify them as period-end adjustment
journals. They should be described that way rather than guessed at.
