# 04: Pipeline tracer — fixture to Report

**What to build:** The thinnest complete path through the pipeline: a small Provider payload fixture becomes a Report containing one Category with a correct total. Narrow but end to end, through both bounded contexts.

**Blocked by:** 02 (Test harness).

**Status:** resolved

- [x] A build-time script reads a Provider payload and emits Report JSON
- [x] Provider vocabulary terminates at the importer per ADR-0002; no provider term appears in the domain model
- [x] Parsing streams rather than loading the whole document
- [x] A ReportTemplate defined as data produces one Category with the correct total
- [x] Money is decimal-based; no floating-point arithmetic on amounts
- [x] A test at Seam 1 proves payload in, Report out, using a small purpose-built fixture

## Comments

Seam 1 is `buildReportFromProviderPayload(payload, template)` in
`src/shared/pipeline/`: an `AsyncIterable<string>` in, a Report out, across both
contexts. Two tests go through it, and nothing asserts on the intermediate
model.

`src/features/ledger/import/wcfGeneralLedger.ts` is the anti-corruption layer and
the only file where `wsGeneralLedger`, `collectif`, `header`, `internalID` or
`ref` appear. Adding a Provider means adding a sibling of that file.

Parsing is incremental, via `saxes`. The importer takes an `AsyncIterable<string>`
rather than a Node stream, which keeps `src/` free of Node types and lets the
test feed the payload in 64-byte chunks on separate ticks — splitting mid-element
and mid-value is exactly where a parser that only pretends to stream falls over.
Only the CLI in `scripts/` touches the filesystem.

Money is an exact count of minor units held as a `bigint`, parsed straight from
the provider's decimal text without ever passing through `Number`. Two fixtures
pin that: `amounts-that-break-floating-point.xml` is the classic 0.10 + 0.20, and
`amounts-beyond-float-precision.xml` sums past 2^53 minor units where a float
returns 90071992547409.94 instead of .93 — the second exists because the first
would also pass for a float implementation that merely rounds on the way out. An
unknown currency throws rather than assuming two decimal places, because that
assumption silently scales JPY by a hundred.

Missing fields fail loudly. An entry without a currency, date, Account code or
identifier is an error, not a default: the first version defaulted currency to
EUR, which had the importer guessing the one thing Money explicitly refuses to
guess.

Entries carry a signed amount — debit positive, credit negative — computed as
debit minus credit, so a row carrying both columns is netted rather than having
one side discarded. It is why Sales totals are negative: revenue carries a credit
balance, which is correct double-entry and a presentation question for ticket 11,
not a pipeline one.

Transaction is deliberately absent. Ticket 04 first grouped Entries into
Transactions by emitting whenever the identifier changed; review showed the
Provider sorts its payload by Account, so the sample's 1202 Transactions arrive
as 6536 fragments and that grouping is simply wrong. It is removed rather than
left to mislead, and the finding plus a proposed resolution is recorded in
ticket 05, which owns the decision.

**Verified against the real ledger, not just the fixtures.** The script processed
the 5.5 MB sample in 1.4 s, and its four Category totals match a completely
independent implementation (Python DOM parse, `Decimal` arithmetic, no project
code) to the cent: Purchases 848198.53, Staff costs 114732.50, Sales
-3019845.34, Other income -1.98. The whole ledger sums to 0.00, which
independently confirms the signed-amount convention. 6774 Entries across 118
Accounts; the pipeline holds the 118, not the 6774.

The browser bundle was checked for `saxes` and `wsGeneralLedger` and contains
neither, so build-time code under `src/` stays out of what ships.

Two things deliberately left for later tickets and marked in the code:
Accounts matched by no Category are dropped rather than surfaced (ticket 09), and
an AuxiliaryAccount is not yet rolled up to its ControlAccount (ticket 06), so
the fixtures use Chart of Accounts codes only.

`src/shared/pipeline/` holds wiring only. Translation belongs to Ledger's
importer and aggregation to Reporting's `ReportAggregator`; an earlier version
folded Entries into Account totals inside the pipeline, which put Reporting's
own work — "aggregates Entries into Categories" — in `shared`. With the domain
behaviour back in its context, a composition file in `shared` is what ADR-0004
allows for code no feature owns.

Two rules are deferred and marked where they will change rather than left
silent: an Account matched by two Categories is counted in both, which ticket 08
fixes with longest-root-wins, and an Account matched by none is dropped, which
ticket 09 surfaces. Today's templates use disjoint CategoryRoots, so neither
bites yet.

For ticket 10: `report.template` is the human label, not a stable identifier.
Story 13 puts the ReportTemplate in the URL, so a slug will be wanted.
