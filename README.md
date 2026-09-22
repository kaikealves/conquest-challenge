# Financial Statements

A React/TypeScript single-page application that shows a company's balance
sheet and profit and loss, summarised from its general ledger into categories
defined by a report template, with drill-down to individual accounts and
export to Excel. The Kotlin backend the brief asks for is designed in a written
dossier; it is not implemented.

## Start here

| If you want to…                           | Read or run                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| See the application                       | `npm install && npm run dev`, then open <http://localhost:5173>                                |
| See it on the supplied sample ledger      | `npm run dev:real` — see [Running on the sample ledger](#running-on-the-sample-ledger)         |
| Read the backend design                   | [Dossier part 1: data model and services model](./docs/dossier/data-and-services-model.md)     |
|                                           | [Dossier part 2: architecture and performance](./docs/dossier/architecture-and-performance.md) |
| Read the API contract                     | [docs/api-contract.md](./docs/api-contract.md)                                                 |
| See why things are the way they are       | [Architecture decision records](./docs/adr/)                                                   |
| Learn the domain vocabulary the code uses | [CONTEXT-MAP.md](./CONTEXT-MAP.md)                                                             |

## The brief, and where each part is answered

| The brief asks for                                                  | Where                                                                                                                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A data model, a services model                                      | [Dossier part 1](./docs/dossier/data-and-services-model.md)                                                                                                                             |
| An architectural blueprint with Java/Kotlin libraries, argued       | [Dossier part 2](./docs/dossier/architecture-and-performance.md), sections 1–4                                                                                                          |
| Performance issues and solutions                                    | [Dossier part 2](./docs/dossier/architecture-and-performance.md), sections 5–6                                                                                                          |
| The most relevant interface contracts (API)                         | [docs/api-contract.md](./docs/api-contract.md); the client's side in [`api/contract.ts`](./src/features/reporting/api/contract.ts)                                                      |
| A component that fetches from a mock API, with loading/error states | [`ReportScreen.tsx`](./src/features/reporting/ReportScreen.tsx) and [`useReport.ts`](./src/features/reporting/api/useReport.ts), against [MSW handlers](./src/shared/mocks/handlers.ts) |
| Parse the sample file                                               | [`tools/importer/providers/wcfGeneralLedger.ts`](./tools/importer/providers/wcfGeneralLedger.ts), a streaming XML parser                                                                |
| Summarise by chart of accounts or date range                        | [`tools/importer/reporting/report.ts`](./tools/importer/reporting/report.ts): category roots per template, one report per fiscal year                                                   |
| Display the summary, handling the hierarchical chart of accounts    | [`ReportTable.tsx`](./src/features/reporting/components/ReportTable.tsx) and [`CategoryRow.tsx`](./src/features/reporting/components/CategoryRow.tsx), which recurses to any depth      |
| Balance sheet with assets = liabilities                             | The importer adds a Result category so a balance sheet nets to zero; the table ends on a visible balance check                                                                          |
| Several report templates, exportable to Excel                       | [`tools/importer/templates/`](./tools/importer/templates/); [`export/buildWorkbook.ts`](./src/features/reporting/export/buildWorkbook.ts)                                               |
| Memoization or lazy loading, with the reasoning                     | [ADR-0008](./docs/adr/0008-memoization-strategy.md), with measurements (`npm run bench`); ExcelJS is loaded only when a user exports                                                    |

## What the application does

- **Balance sheet and profit and loss**, each a tree of categories that expands
  down to the accounts in it. A profit and loss ends on its net result; a
  balance sheet ends on the check that it balances.
- **Several companies**, each with its own chart of accounts and the report
  templates that fit it: a French company's revenue accounts start with 7, a
  UK company's with 4.
- **Company, template and period live in the URL**, so any report can be
  bookmarked or sent to a colleague, and Back works as expected.
- **Nothing is silently dropped.** Accounts that no category claims are shown
  in an Unmatched group with their total, so an incomplete template shows up
  as a figure rather than a gap.
- **A balance sheet that carried nothing forward says so.** The sample ledger
  was exported mid-2017, before 2016 was closed, so its 2017 balance sheet
  holds that year's movements only; the page warns about it instead of
  presenting them as balances.
- **Loading, empty and error states**, with a retry button. Reports already
  visited are shown instantly from the cache.
- **Excel export** of the report on screen, with the category tree kept as
  grouped rows and amounts as numbers a spreadsheet can compute with.
- **Exact amounts.** Money is carried as integer minor units and crosses the
  API as decimal strings, never as floating point.

## How it fits together

```
Provider payload (XML)  →  importer (tools/importer/)  →  Report JSON  →  React application (src/)
                           parse, roll up sub-accounts,    /data/…         fetch, cache, render,
                           aggregate by template                           export
```

- **`tools/importer/`** holds all the accounting logic and never runs in a
  browser. It stands in for the backend at build time: it reads a Provider
  payload and writes the JSON the application fetches
  ([ADR-0006](./docs/adr/0006-importer-is-a-tool-outside-the-application.md)).
- **`src/`** is the React application. It holds no domain model and does no
  arithmetic on amounts; it renders reports that arrive already computed.
- **The API** is the set of URLs in [docs/api-contract.md](./docs/api-contract.md).
  In development and tests, [MSW](https://mswjs.io/) answers them with invented
  figures ([ADR-0003](./docs/adr/0003-no-backend-msw-is-the-api-boundary.md));
  otherwise they are static JSON written by the importer
  ([ADR-0007](./docs/adr/0007-static-json-is-the-api-not-msw.md)). Replacing
  either with a real backend is a base-URL change.
- **Server state** belongs to TanStack Query: caching, request deduplication,
  retries, and loading and error states come from one place, and no component
  fetches in a `useEffect` ([ADR-0005](./docs/adr/0005-tanstack-query-owns-server-state.md)).

### Source layout

```
src/
├── App.tsx                       # Shell and routes
├── features/reporting/           # The one feature (ADR-0004: feature-first layout)
│   ├── CONTEXT.md                # Reporting glossary
│   ├── ReportsPage.tsx           # Resolves Company → template → period from the URL
│   ├── ReportScreen.tsx          # Fetches one Report; loading, error, empty, ready
│   ├── api/                      # Contract types and TanStack Query hooks
│   ├── components/               # Table, rows, choosers, export button
│   └── export/                   # Excel workbook, loaded on demand
└── shared/
    ├── mocks/                    # MSW handlers: the API in tests and development
    └── queryClient.ts            # Retry and caching policy

tools/importer/
├── CONTEXT.md                    # Ledger glossary
├── main.ts                       # CLI entry point
├── providers/                    # Anti-corruption layer for each Provider format
├── domain/                       # Entry, AccountCode, Money
├── reporting/                    # Aggregation into Reports
├── templates/                    # Report templates (JSON)
└── fixtures/                     # Small purpose-built ledgers, one per test case
```

### Bounded contexts

The code is split into two contexts with separate vocabularies: **Ledger**
(entries posted to accounts, as received) and **Reporting** (categories and
reports). The word "account" means something different on each side: a
customer's own sub-account exists in the ledger but is rolled up into its
control account before reporting. See [CONTEXT-MAP.md](./CONTEXT-MAP.md) and
[ADR-0001](./docs/adr/0001-ledger-and-reporting-bounded-contexts.md).

### Architecture decisions

| ADR                                                                   | Decision                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| [0001](./docs/adr/0001-ledger-and-reporting-bounded-contexts.md)      | Ledger and Reporting are separate bounded contexts             |
| [0002](./docs/adr/0002-importer-is-an-anti-corruption-layer.md)       | The importer is an anti-corruption layer                       |
| [0003](./docs/adr/0003-no-backend-msw-is-the-api-boundary.md)         | No backend in scope; MSW defines the API boundary              |
| [0004](./docs/adr/0004-feature-first-source-layout.md)                | Feature-first source layout                                    |
| [0005](./docs/adr/0005-tanstack-query-owns-server-state.md)           | TanStack Query owns server state                               |
| [0006](./docs/adr/0006-importer-is-a-tool-outside-the-application.md) | The importer is a tool outside the application                 |
| [0007](./docs/adr/0007-static-json-is-the-api-not-msw.md)             | Static JSON is the API; MSW is for tests                       |
| [0008](./docs/adr/0008-memoization-strategy.md)                       | Memoize what was measured to cost something, and nothing else  |
| [0009](./docs/adr/0009-company-is-a-shared-passthrough.md)            | Company is carried through unchanged, owned by neither context |
| [0010](./docs/adr/0010-company-switcher.md)                           | Company becomes a real, selectable entity                      |

## Running it

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev          # http://localhost:5173, served by the mock API
```

### Running on the sample ledger

The supplied sample is a third party's real accounting record, so it is not in
the repository and nothing derived from it is committed. To run on it, place it
at `brief/brignolles-gl.xml` and run:

```bash
npm run dev:real
```

This runs the importer over the sample, writes its output to
`.local/real-ledger/data/` (gitignored), and starts the application on it with
the mock API switched off. It also imports a small synthetic UK company, so
the company switcher has two differently structured charts to switch between.
Details, and how to import another ledger, are in
[docs/real-ledger-locally.md](./docs/real-ledger-locally.md).

### The importer on its own

```bash
npm run import -- <payload.xml> <output-dir>/data --country=FR [--company-id=…] [--company-name=…]
```

`--country` selects the report templates whose chart of accounts applies.

## Tests and checks

```bash
npm test             # Vitest: importer and application
npm run test:e2e     # Playwright, in Chromium
npm run typecheck
npm run lint
npm run format:check
npm run bench        # The render measurements behind ADR-0008
```

CI runs all of these, plus a production build, on every pull request.

Tests assert behaviour at the two highest seams, never implementation details:

1. **The importer:** a Provider payload in, Report JSON out.
2. **The application:** rendered against the MSW handlers, and queried by role
   and accessible name as a user would find things.

Each test uses a small fixture named for the case it covers, such as
`a-year-that-carries-nothing-forward.xml` or
`customer-and-supplier-auxiliary-accounts.xml`. The sample ledger is never a
test fixture: a failure among 6,774 entries is not legible.

## Stack

| Concern      | Choice                                        |
| ------------ | --------------------------------------------- |
| Build        | Vite 8, React 19, TypeScript                  |
| Styling      | Tailwind 4, CSS-first via `@tailwindcss/vite` |
| Routing      | React Router                                  |
| Server state | TanStack Query 5                              |
| Mock API     | MSW 2                                         |
| Tests        | Vitest, React Testing Library, Playwright     |
| Code quality | ESLint, Prettier                              |
| Excel export | ExcelJS 4                                     |

## Scope

Deliberately not built:

- **The backend.** It is designed in the dossier; the importer stands in for it
  at build time.
- **A hosted deployment.** Reviewing locally with `npm run dev` or
  `npm run dev:real` shows everything. A production build serves whatever
  importer output is under `public/data/`, which is empty in the repository.
- **Providers other than the sample's XML format.** The anti-corruption layer
  in `tools/importer/providers/` is where a JSON or CSV Provider would go.
- **Carrying balances forward** into a year that has none. The application
  flags such a balance sheet; rolling the previous year's closing balances
  forward is the natural next step in the importer.

The work was planned as tickets in
[`.scratch/accounting-reports/`](./.scratch/accounting-reports/), each shipped
as its own pull request.
