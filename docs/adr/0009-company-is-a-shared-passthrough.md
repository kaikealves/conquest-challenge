---
status: accepted
---

# Company is a shared, unreinterpreted concept — not owned by one context

## Context

The brief targets "hundreds or thousands of companies." Until now nothing in
this codebase names that concept: a Report carries a ReportTemplate and a
Period, but nothing says whose ledger it came from. The running app gave a
reviewer no way to tell.

The sample ledger itself carries no Company field anywhere — checked against
every Entry and against the brief PDF, neither names a company. "Which Company"
is a fact about the import job (which payload, whose credentials, which
endpoint), never a fact the payload states about itself.

## Decision

**Company is carried through unchanged, not reinterpreted at the Ledger →
Reporting boundary**, and it is documented once, as a **Shared** concept in
`CONTEXT-MAP.md`, rather than with two context-specific definitions.

This differs from how this codebase already treats a structurally similar case.
`FiscalYear` (Ledger) and `Period` (Reporting) name the same real-world thing —
a date range accounting resets against — but get two definitions, because the
boundary actually transforms it: a FiscalYear's OpeningBalance handling is
Ledger-specific accounting behaviour, while a Period is presentation framing
("the date range a Report covers"). The same pattern holds for
`AuxiliaryAccount` → `ControlAccount`: a real rollup happens at the boundary.

Company has no such transformation. It goes in as an import argument and comes
out as a display string, identical on both sides. Two definitions for one
untransformed fact would be redundant rather than precise.

Unlike the codebase's other Shared concepts (`AccountCode`, `Money`), Company
**does** cross into the application — those two exist only inside the importer.
Company is the first Shared concept the client actually receives.

**The importer's Company-name input is optional, derived from the payload's
filename when omitted.** The committed code contains only that derivation
rule — never a name derived from `brief/`. `npm run dev:real` passes nothing
and gets the real Company's name locally, the same way it already surfaces real
figures locally: nothing is committed, nothing changes about what ships.

**No Company selector is built.** There is one real Company's ledger in this
project. Building a picker would mean fabricating a second Company's data to
have anything to pick between — inventing a demonstration the brief's design
questions (data model, services model, architecture) already cover in writing,
for a build that does not need to prove multi-tenancy at runtime.

## Considered Options

- **Two context-specific definitions** (Ledger's Company vs Reporting's
  Company), matching the FiscalYear/Period and AuxiliaryAccount/ControlAccount
  pattern. Rejected: there is no transformation to justify two definitions: the
  same string enters and leaves unchanged.
- **A Company selector with synthetic second-company data.** Rejected: the
  challenge's own instruction was not to overdo this; fabricating a full second
  ledger's worth of data to demonstrate an axis the written design already
  argues is disproportionate to what a reviewer gains from it.
- **Company on `Report` only, or `ReportTemplateIndex` only.** Rejected in
  favour of both: `ReportTemplateIndex` alone would leave the Excel export
  unable to say whose figures it holds without an extra request; `Report`
  alone would leave the page header waiting on a Report to load before it can
  orient a reader at all. The duplication is one string.
- **A dedicated `/data/company.json` endpoint.** Rejected: architecturally the
  cleanest option, but a new resource for one string is the kind of ceremony a
  single-company build does not need. Revisit if a Company selector is ever
  built.

## Consequences

- `ReportTemplateIndex` and `Report` both carry a `Company`. Every place either
  type is constructed — the importer, the mock handlers, and every test fixture
  across both seams — needs the field.
- If this project ever adds a real Company selector, this ADR's "no selector"
  half is what gets revisited, not the shared-passthrough shape: the field
  already exists everywhere a selector would need it.
- `dev:real` continues to need no flag or argument to show real data locally;
  the filename-derivation rule is the only place "how do we name an unnamed
  Company" is decided, and it is generic, not payload-specific.
