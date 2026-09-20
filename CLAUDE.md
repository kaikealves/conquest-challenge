# conquest-challenge

A two-day take-home: a React/TypeScript SPA presenting summarised accounting
Reports from an imported general ledger. The graded deliverable is the frontend
plus a written design dossier.

## Where things live

- **What to build**: `.scratch/accounting-reports/spec.md`, split into 26 tickets
  under `.scratch/accounting-reports/issues/`. Work them blockers-first; each
  ticket declares what gates it.
- **Domain language**: `CONTEXT-MAP.md` points to one `CONTEXT.md` per bounded
  context. Use these words in type, component and test names — the glossaries
  list the synonyms to avoid.
- **Where code goes**: `tools/importer/` holds every piece of accounting logic
  and never runs in a browser. `src/` is the React application, which holds no
  domain model — it renders Reports that arrive already computed (ADR-0006).
- **Decisions**: `docs/adr/`. Read the ones touching your area before changing it,
  and surface a contradiction rather than silently overriding it.

## Stack

Pinned at the versions current when chosen.

| Concern      | Choice                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Build        | Vite 8, React 19, TypeScript                                                                                             |
| Styling      | Tailwind 4 — CSS-first config via `@tailwindcss/vite`, **no `tailwind.config.js`**; shadcn/ui for interactive primitives |
| Routing      | react-router; ReportTemplate and Period live in the URL                                                                  |
| Server state | TanStack Query 5 — never `useEffect` for fetching (ADR-0005)                                                             |
| Mock API     | MSW 2 — the handlers **are** the API contract (ADR-0003)                                                                 |
| Tests        | Vitest + React Testing Library; Playwright for end-to-end                                                                |
| Lint         | ESLint + Prettier                                                                                                        |
| Excel        | ExcelJS 4 — not `xlsx`, whose npm build is frozen at an old version                                                      |
| Deploy       | Vercel                                                                                                                   |

No backend is implemented; it is a design deliverable only. The importer stands
in for it at build time and writes the JSON the application fetches. See ADR-0006
and ADR-0007.

## Conventions

- **Never add AI attribution to commits or pull request descriptions.** No
  `Co-Authored-By: Claude`, no "Generated with" lines.
- `brief/` and `notes/` are gitignored and must stay that way. `brief/` holds the
  employer's materials and a third party's real accounting data.
- **The sample ledger is not a test fixture.** Tests use small purpose-built
  fixtures, each named for the case it covers.
- Tests assert behaviour at the highest seam. There are two: the importer
  (Provider payload in, Report JSON out) and the application rendered against
  MSW.
- **Never commit anything derived from `brief/`.** The sample is a third party's
  real accounting record, and a summary of it is still their data. The deployed
  site runs on the synthetic ledger.
- Object types are declared with `type`, never `interface`, and there are no
  classes. Both are enforced by ESLint.
- **Every ticket ships as its own pull request**, starting from ticket 01. One
  ticket, one branch, one PR.
- **Never merge a pull request, and never push to `main`.** The user reviews and
  merges every PR themselves on GitHub. Open the PR, report its URL, and stop
  there — this applies even when CI is green and even when asked to "finish" a
  ticket.
- Do not enable auto-merge, and do not push directly to `main` for any reason,
  including documentation or configuration changes.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, used verbatim as label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` at the root points to one `CONTEXT.md` per bounded context under `src/features/`. ADRs live in `docs/adr/`. See `docs/agents/domain.md`.
