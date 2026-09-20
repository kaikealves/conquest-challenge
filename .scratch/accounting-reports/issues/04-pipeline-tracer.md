# 04: Importer tracer — fixture to Report JSON

**What to build:** The thinnest complete path through the importer: a small Provider payload fixture becomes Report JSON containing one Category with a correct total. Narrow but end to end.

**Blocked by:** 02 (Test harness).

**Status:** ready-for-agent

- [ ] The importer is a standalone tool in `tools/importer/`, outside the application, with its own tsconfig
- [ ] Provider vocabulary terminates at the translator per ADR-0002; no provider term appears in the domain model
- [ ] Parsing streams rather than loading the whole document
- [ ] A ReportTemplate defined as data produces one Category with the correct total
- [ ] Money is decimal-based; no floating-point arithmetic on amounts
- [ ] The tool writes `public/data/templates.json` and `public/data/reports/{template}/{period}.json`
- [ ] A test at Seam 1 proves payload in, Report JSON out, using a small purpose-built fixture

## Comments

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
