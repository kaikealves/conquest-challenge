# Conquest Challenge: Accounting Reports

A React/TypeScript single-page application for importing and visualizing summarized accounting reports from general ledgers. The application presents accounting data as hierarchical, navigable reports — a Balance Sheet and a Profit & Loss statement — aggregated from a Chart of Accounts.

## Getting Started

### Prerequisites

- **Node.js** 20.19.0 or 22.12.0+

### Installation

```bash
npm install
```

### Running the Application

#### Development mode (with mock API)

```bash
npm run dev
```

The application opens at `http://localhost:5173` with a mock API serving sample data via [MSW](https://mswjs.io/). No importer setup is needed.

#### Real ledger mode (optional)

To develop against the importer's own output:

```bash
npm run dev:real
```

**Note:** This requires the sample ledger to be present. See [Real Ledger Data](#real-ledger-data) below.

#### Production build

```bash
npm run build
```

Output is written to `dist/`. Preview locally with:

```bash
npm run preview
```

## Testing

The application has three test suites, each with a distinct seam:

### Unit and integration tests

```bash
npm run test          # Run once
npm run test:watch    # Re-run on file changes
```

Tests use Vitest + React Testing Library. They assert behaviour at the highest visible seam: the importer (Provider payload in, Report JSON out) and the application rendered against MSW.

Each test uses a small, purpose-built fixture rather than the sample ledger; fixtures are named for the case they cover (e.g., `openingBalanceEntries`, `unmatchedAccounts`).

### End-to-end tests

```bash
npm run test:e2e
```

Playwright tests exercise the full application in a browser. They verify that features work as the user experiences them.

### All tests

```bash
npm run test:all
```

Runs both unit/integration and end-to-end suites.

## Code Quality

### Type checking

```bash
npm run typecheck
```

TypeScript is enforced at build time and when running tests. The project refuses to build with type errors.

### Linting

```bash
npm run lint          # Check only
npm run lint:fix      # Auto-fix issues
```

Uses ESLint with rules for React and React Hooks. Some rules are enforced (e.g., object types must use `type`, never `interface`; no classes).

### Formatting

```bash
npm run format        # Format all files
npm run format:check  # Check without writing
```

Uses Prettier. Formatting is enforced in CI.

## Architecture

### High-level overview

Accounting data flows through three stages:

1. **Import**: An external provider's format is translated into a flat general ledger of balanced Transactions.
2. **Aggregation**: Entries are grouped into Categories according to a ReportTemplate, producing summarized Reports.
3. **Presentation**: A React application fetches and displays Reports as hierarchical, navigable UI.

The import and aggregation stages run at build time; the application holds no domain model of its own and renders already-computed data.

### Bounded contexts

The system is divided into two bounded contexts, each with its own vocabulary:

- **[Ledger](./tools/importer/CONTEXT.md)**: Receives accounting data and models it as Entries posted to Accounts. Lives entirely in `tools/importer/` because nothing runs in a browser. Applies an anti-corruption layer to translate provider vocabulary.

- **[Reporting](./src/features/reporting/CONTEXT.md)**: Aggregates Entries into Categories to produce summaries. Split across the boundary: aggregation in the importer, presentation in React.

For details, see [CONTEXT-MAP.md](./CONTEXT-MAP.md).

### Architecture decisions

Key decisions are documented as Architecture Decision Records in [`docs/adr/`](./docs/adr/):

- **[ADR-0001](./docs/adr/0001-ledger-and-reporting-bounded-contexts.md)**: Two bounded contexts (Ledger and Reporting) with separate vocabularies.
- **[ADR-0002](./docs/adr/0002-importer-is-an-anti-corruption-layer.md)**: Provider vocabulary is translated at the boundary, never entering the domain model.
- **[ADR-0003](./docs/adr/0003-no-backend-msw-is-the-api-boundary.md)**: No backend is implemented; MSW (Mock Service Worker) stands in as the API during development.
- **[ADR-0005](./docs/adr/0005-tanstack-query-owns-server-state.md)**: TanStack Query (React Query) manages all server state; never use `useEffect` for fetching.
- **[ADR-0006](./docs/adr/0006-importer-is-a-tool-outside-the-application.md)**: The importer is a build-time tool, not a deployed service.
- **[ADR-0007](./docs/adr/0007-static-json-is-the-api-not-msw.md)**: In production, the API is static JSON written by the importer, not MSW.
- **[ADR-0008](./docs/adr/0008-memoization-strategy.md)**: Memoization strategy for the importer pipeline.
- **[ADR-0009](./docs/adr/0009-company-is-a-shared-passthrough.md)**: Company is a shared value passed unchanged across boundaries.
- **[ADR-0010](./docs/adr/0010-company-switcher.md)**: Users can switch between Companies, each with its own Chart of Accounts.

### Directory structure

```
.
├── src/                           # React application
│   ├── features/
│   │   └── reporting/            # Reporting feature (only bounded context in React)
│   │       ├── CONTEXT.md        # Domain language for Reporting
│   │       ├── api/              # Fetching and contract
│   │       └── ui/               # React components
│   └── shared/
│       ├── mocks/               # MSW handlers (development only)
│       └── queryClient.ts       # TanStack Query configuration
│
├── tools/importer/               # Importer (build-time tool, never runs in browser)
│   ├── CONTEXT.md               # Domain language for Ledger
│   ├── main.ts                  # Entry point
│   ├── fixtures/                # Test fixtures (purpose-built, not sample data)
│   └── [pipeline code]
│
├── docs/
│   ├── adr/                     # Architecture Decision Records
│   └── agents/                  # Agent skill documentation
│
├── CONTEXT-MAP.md               # Relationships between bounded contexts
├── CLAUDE.md                    # Project conventions and instructions
└── .scratch/
    └── accounting-reports/      # Tickets and specification (development only)
```

## Features

### What's implemented

- 📊 **Hierarchical reports**: Balance Sheet and Profit & Loss statements that expand from Category to individual Account.
- 🔄 **Company switcher**: Choose which Company to view; each has its own Chart of Accounts.
- 📋 **Template selection**: Apply different ReportTemplates to the same data.
- 📅 **Period selection**: View reports for different time periods.
- 📈 **Balanced statements**: Balance Sheet verifies that assets equal liabilities; Result reconciles to Profit & Loss.
- 🔗 **Shareable URLs**: Reports are reflected in the URL for bookmarking and sharing.
- 📥 **Excel export**: Export reports to Excel (selected accounts/categories only).
- ⚡ **Instant navigation**: Previously viewed Reports are cached and reappear instantly.
- 🐛 **Error recovery**: Clear error messages with a retry button for failed requests.

### Out of scope (deliberate omissions)

- **Backend implementation**: The importer is a build-time tool. In production, it outputs static JSON; no server is deployed. (See [ADR-0006](./docs/adr/0006-importer-is-a-tool-outside-the-application.md) and [ADR-0007](./docs/adr/0007-static-json-is-the-api-not-msw.md).)
- **Deploy to production**: The application is designed to run locally for review. (See priority notes.)
- **Integration with external accounting systems beyond XML import**: Only the XML provider format is implemented.
- **Advanced charting**: Reports are tables, not graphs (though amounts are formatted consistently with currency).

## The Brief's "React component that fetches from a mock API"

The **Report screen** (`src/features/reporting/ui/Report.tsx`) satisfies the brief's requirement for "a React component that fetches data from a mock API (e.g. JSONPlaceholder), manages loading/error states."

The component:

- Fetches Report data from the `/api/reports/:template/:period` endpoint.
- Displays a loading indicator while fetching.
- Shows a clear error message with a retry button on failure.
- Manages state via TanStack Query, which handles retries, caching, and deduplication.

In development, the API is provided by MSW. In production, it is static JSON. Either way, the component is unaware of the implementation detail.

## Real Ledger Data

To develop against a real accounting ledger:

1. Place the XML ledger file at `brief/brignolles-gl.xml`.
2. Place the Chart of Accounts XML at `brief/chart-of-accounts.xml` (or use the provided UK demo).
3. Run:
   ```bash
   npm run dev:real
   ```

The importer writes data to `.local/real-ledger/data`, and the application serves it from there.

**Why `brief/` and `.local/` are not committed:**

- `brief/` contains third-party real accounting data, supplied by the employer. It is confidential and must not be committed to version control.
- `.local/` is derived from `brief/` and carries the same confidentiality.
- The deployed site builds from a synthetic ledger, so neither ever reaches production.

For security: `.gitignore` excludes both directories. Never commit anything derived from `brief/`.

## Stack

| Concern       | Choice                                         |
| ------------- | ---------------------------------------------- |
| Build         | Vite 8, React 19, TypeScript                   |
| Styling       | Tailwind 4 (CSS-first via `@tailwindcss/vite`) |
| UI primitives | shadcn/ui (built on Radix)                     |
| Routing       | react-router                                   |
| Server state  | TanStack Query 5                               |
| Mock API      | MSW 2 (handlers are the API contract)          |
| Tests         | Vitest + React Testing Library + Playwright    |
| Code quality  | ESLint + Prettier                              |
| Excel export  | ExcelJS 4                                      |

## Contributing

When working on a ticket:

1. Create a branch named `feat/<ticket-number>-<slug>` (e.g., `feat/21-readme`).
2. Work the ticket to completion and open a pull request.
3. Do not merge — the author (user) reviews and merges on GitHub.

For naming conventions and vocabulary, see [CONTEXT-MAP.md](./CONTEXT-MAP.md) and the `CONTEXT.md` files in each bounded context.

## Troubleshooting

**MSW not starting in development:**

- Check the browser console for errors.
- Clear service worker registrations: in DevTools > Application > Service Workers, click "Unregister" on any entries.
- Run `npm run dev` again.

**Tests timing out:**

- MSW may be slow to start in the test environment. Run a single test file first to verify setup:
  ```bash
  npm run test -- src/App.test.tsx
  ```

**Type errors at build:**

- Run `npm run typecheck` to see all errors.
- The project refuses to build with outstanding type errors.

## Support

For help with Claude Code or this project structure, see [CLAUDE.md](./CLAUDE.md).
