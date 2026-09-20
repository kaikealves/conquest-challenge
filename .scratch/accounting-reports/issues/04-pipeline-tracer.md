# 04: Importer tracer — fixture to Report JSON

**What to build:** The thinnest complete path through the importer: a small Provider payload fixture becomes Report JSON containing one Category with a correct total. Narrow but end to end.

**Blocked by:** 02 (Test harness).

**Status:** resolved

- [x] The importer is a standalone tool in `tools/importer/`, outside the application, with its own tsconfig
- [x] Provider vocabulary terminates at the translator per ADR-0002; no provider term appears in the domain model
- [x] Parsing streams rather than loading the whole document
- [x] A ReportTemplate defined as data produces one Category with the correct total
- [x] Money is decimal-based; no floating-point arithmetic on amounts
- [x] The tool writes `public/data/templates.json` and `public/data/reports/{template}/{period}.json`
- [x] A test at Seam 1 proves payload in, Report JSON out, using a small purpose-built fixture

## Comments

Built as agreed. `tools/importer/` is a standalone tool with its own tsconfig
project, referenced from the root solution, so `tsc -b` covers it and ESLint
lints it. Nothing under `src/` imports it.

Seam 1 is `buildReports(payload, template)` — an `AsyncIterable<string>` in, one
Report per Period out. Five tests go through it and nothing asserts on the
intermediate model, so the whole aggregation was restructured mid-ticket without
a single test changing.

`providers/wcfGeneralLedger.ts` is the only file where `wsGeneralLedger`,
`number`, `internalID` or `collectif` appear.

Output is `templates.json` plus `reports/{templateId}/{period}.json`. A template
carries a stable `id` separate from its display name, because story 13 puts it in
a shareable URL and renaming a template must not break a bookmark.

A Period is a calendar year, derived from the Entry date. A FiscalYear can start
in any month; ticket 15 owns making that configurable rather than assumed, and
`periodOf` says so.

`public/data/` is gitignored. Output built from `brief/` is a third party's real
accounting data, and the guard belongs in the repository rather than in
someone's memory.

**Verified against the real ledger.** The importer writes five Reports, one per
FiscalYear, and every Category total in every Period matches an independent
implementation (Python, DOM parse, `Decimal`, no project code). The whole ledger
sums to 0.00, confirming the signed-amount convention.

Two new fixtures beyond the port: one Entry carrying both a debit and a credit,
which nets to 100.00 rather than discarding a side — no such row exists in the
sample, so only a purpose-built fixture catches it — and Entries in two
FiscalYears, so a Period totals only its own.

### Carried over from the closed attempt

Supersedes the first attempt, which was closed as PR #5. That version was correct
— its totals matched an independent implementation to the cent against the real
5.5 MB ledger — but it lived under `src/`, so the application's source tree
carried build-time code, and it emitted a finished Report, which cannot be
recomputed when a template or Period changes. See ADR-0006 and ADR-0007.

Carried over from that work, all of it verified:

- The Provider sorts its payload by Account. Entries of one Transaction are
  scattered, so they cannot be grouped in a forward pass; Transaction is not
  modelled. See ticket 05.
- A signed amount is debit minus credit, so a row carrying both columns is netted
  rather than having one side discarded.
- Money is an exact `bigint` count of minor units. Two fixtures pin it: the
  classic 0.10 + 0.20, and one summing past 2^53 minor units where a float gives
  90071992547409.94 rather than .93.
- A missing currency, date, Account code or identifier is an error, not a
  default.
- AccountCodes run 3 to 11 characters in the sample, so matching lives on the
  value object rather than at call sites.
