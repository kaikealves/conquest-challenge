# Dossier: data model and services model

The brief asks for a data model and a services model, argued rather than
merely listed. This document is that argument. It uses the vocabulary defined
in [CONTEXT-MAP.md](../../CONTEXT-MAP.md) and the two glossaries it points to
— [Ledger](../../tools/importer/CONTEXT.md) and
[Reporting](../../src/features/reporting/CONTEXT.md) — exactly, including
where a term is deliberately avoided. The tactical terms _aggregate_,
_entity_ and _value object_ are Domain-Driven Design vocabulary, not part of
that glossary; they classify the glossary's terms rather than add to them.

## Data model

### The aggregate: Transaction

**Transaction** is the aggregate root. An aggregate is a consistency
boundary: the smallest group of objects that must be treated as one unit
because an invariant spans it. Here that invariant is the zero-sum rule — a
Transaction's Entries balance to zero, or the Transaction is not accounting
data. No smaller unit than a complete Transaction can be judged correct or
incorrect; a single Entry, read alone, is neither valid nor invalid.

Transaction is not modelled as a class anywhere in this codebase. The Provider
sorts its payload by Account rather than by Transaction, so one Transaction's
Entries are scattered across the document — in the sample ledger, 1202
Transactions arrive as 6536 contiguous runs, the largest spanning 604 Entries.
Holding every Entry until the identifier's last occurrence is seen would make
the aggregate real in code, but it is O(Entries) and abandons the streaming
this design otherwise holds to throughout. The two-pass alternative — a
running sum per transaction identifier on the first pass, folding Entries
into Account totals while skipping quarantined identifiers on the second —
enforces the same invariant in O(Transactions) memory without ever holding
one Transaction's Entries as an object. It is exactly the case ADR-0006
describes: "domain logic whose output is not visible on screen is dossier
material rather than code." The invariant is real; the aggregate that owns it
is argued here, not instantiated.

A backend with a database would not need this design. It would insert Entries
as they arrive and validate with a `GROUP BY` having a non-zero sum — the
aggregate boundary enforced by a query rather than by an in-memory object.
The two-pass streaming design is a consequence of reading a file once, not of
the domain; see [ADR-0006](../adr/0006-importer-is-a-tool-outside-the-application.md)
and the architecture dossier for what a real backend does instead.

### Entities

**Entry** is the one entity inside the Transaction aggregate. It is
identified by the Provider's own stable identifier
(`tools/importer/domain/entry.ts`), carried specifically so that re-running
an import is idempotent — identity that persists across a re-fetch is the
trait that makes it an entity rather than a value object. An Entry has no
meaning independent of the Transaction it belongs to: it is one Money amount
posted to one Account on one date, and whether it is _correct_ is a question
only its Transaction can answer.

**Company** and **ReportTemplate** each carry an identifier that is
deliberately independent of their display attributes — a Company's `id`
survives a rename of its `name` (ADR-0009), and a ReportTemplate's `id` is
the stable slug a shareable URL depends on, kept separate from the `name` a
reader sees, for the same reason. That independence is the entity trait:
identity, not attribute equality, is what is compared. (Account, the
glossary's third identity-bearing noun, is discussed on its own below: it is
named and referenced throughout this design but is not modelled this way.)

### Value objects

**Money** is an amount and its currency, held as an exact integer count of
minor units rather than a float — two Moneys are equal exactly when their
minor units and currency match, and neither carries an identity beyond that.
**AccountCode** is the hierarchical, variable-length identifier of an
Account; equality is its string value, and matching against it is always
textual and left-anchored, never numeric, so a three-character AccountCode and
an eleven-character one compare correctly against each other. Both are defined
in `tools/importer/domain/` and are Shared per CONTEXT-MAP.md: they exist only
inside the importer and never cross to the application, which receives
computed decimal strings instead of amounts it would need to do arithmetic
on.

**CategoryRoot** (an AccountCode prefix plus the Category it feeds) and
**ReportKind** (`BalanceSheet` or `ProfitAndLoss`, deciding whether
OpeningBalance Entries are included) are value objects on the Reporting side,
each fully defined by its data and interchangeable with an equal one.

### What is deliberately not an entity: Account

The glossary defines **Account** as a bucket in the Chart of Accounts that an
Entry is posted to, and it matters throughout this design — CategoryRoot
matches against it, a Report groups by it. It is nonetheless not modelled as
an entity with its own identity and lifecycle anywhere in the code. What
exists is an `AccountCode` (value object) and a display name, both carried on
the `Entry` that was posted to it (`entry.account`, `entry.accountName`); a
Report groups Entries by `AccountCode` rather than dereferencing an `Account`
object.

This is a deliberate economy, not an oversight. Nothing in this system ever
needs to know about an Account independent of the Entries posted to it —
there is no Chart of Accounts loaded as a standing list of Accounts, and a
ReportTemplate matches directly against the AccountCodes Entries actually
carry rather than against a Chart of Accounts read from anywhere else. A real
Account entity would earn its place the day something needs to reason about
an Account with no Entries yet — validating a ReportTemplate's CategoryRoots
against a live Chart of Accounts before import, for instance, which this
design does not attempt today and which the glossary's "Not modelled in code"
note on Transaction sets the precedent for stating plainly rather than
quietly working around.

**AuxiliaryAccount** and **ControlAccount** are not separate types either.
Both are AccountCodes; which relationship applies is a fact about one Entry
— `entry.controlAccount`, set only when `entry.account` is an
AuxiliaryAccount — not a distinct entity in its own right. **OpeningBalance**
is smaller still: a boolean on Entry (`entry.openingBalance`), read at the
Ledger → Reporting boundary to decide whether the Entry belongs in a
BalanceSheet, a ProfitAndLoss, or both. **Journal** is named in the glossary
— the book a Transaction originated in — but nothing in this design groups or
filters by it; it is vocabulary reserved for a need no user story asks for
yet, not a gap in what is built.

### Reporting's data is a computed projection, not a second aggregate

Ledger's tactical shape does not repeat on the Reporting side, and that
asymmetry is itself a finding worth stating rather than papering over with
matching vocabulary. A **Report** — its Categories, their nested children,
the Accounts within them, **Unmatched**, **Result** — is built once by the
importer and never mutated afterwards; the application that receives it does
no arithmetic on it at all (ADR-0006). An aggregate exists to protect an
invariant under mutation. Nothing on the Reporting side is ever mutated, so
there is no consistency boundary to protect and no aggregate to name. A
Report is closer to a value object at the scale of a whole document: two
Reports built from equal inputs are interchangeable, and nothing tracks a
Report by identity across time the way Entry is tracked for idempotent
re-import.

This is why the zero-sum invariant belongs to Transaction and not, say, to
Report balancing to zero: a BalanceSheet nets to zero (API contract rule 8)
as a _consequence_ of correctly aggregating Entries that were valid accounting
data to begin with, not as an invariant a Report enforces on itself.
Reporting's job is projection; Ledger's is integrity.

## The two bounded contexts and the translation between them

Two contexts divide the work, per
[ADR-0001](../adr/0001-ledger-and-reporting-bounded-contexts.md), and each
has its own definition of "Account" because the word provably means two
different things either side of the boundary: in the accounting record, an
AuxiliaryAccount such as `0EDF` is a real posting target belonging to a
customer's sub-ledger; in any Report, it does not exist, having been rolled
up into its ControlAccount `411100`.

**Ledger** (`tools/importer/`) receives accounting data from a Provider and
holds it as Entries posted to Accounts. It owns the integrity of the
accounting record — the zero-sum invariant above — and does no aggregation.
It lives entirely outside the browser, per
[ADR-0006](../adr/0006-importer-is-a-tool-outside-the-application.md), because
none of it is visible on screen: it is build-time work whose only observable
trace is the JSON it writes.

**Reporting** (split, per ADR-0006, between the importer's aggregation and
the application's presentation) aggregates Entries into Categories to
produce a BalanceSheet or a ProfitAndLoss. It never sees an AuxiliaryAccount:
every Account it handles is a real Chart of Accounts Account.

**The translation between them is the auxiliary rollup**, and it is the only
place it happens. `reportedAccount(entry)` in
`tools/importer/domain/entry.ts` returns an Entry's ControlAccount when it was
posted to an AuxiliaryAccount and its own Account otherwise; aggregation
reads only this derived Account, never `entry.account` directly, so an
AuxiliaryAccount cannot reach a Report by any other route. This is also why
Ledger and Reporting need two definitions of "Account" rather than one
shared one — a real transformation happens at the boundary, the same reason
[ADR-0009](../adr/0009-company-is-a-shared-passthrough.md) gives for why
FiscalYear (Ledger) and Period (Reporting) get two definitions but Company
gets one: Company crosses unchanged, an import argument that comes out an
identical display string, so one definition is precise rather than two being
redundant.

A third boundary precedes Ledger without being a bounded context of its own:
**Provider → Ledger** is an anti-corruption layer
([ADR-0002](../adr/0002-importer-is-an-anti-corruption-layer.md)). Provider
vocabulary — `wsGeneralLedger`, `collectif`, `letteredInBetween`, `voucherRef`
— is translated in `tools/importer/providers/wcfGeneralLedger.ts` and
terminates there; no Provider term is permitted past it. Adding a second
Provider means writing one more translator against the same Ledger types,
never touching Reporting.

## Services model

Four responsibilities are distinct, each with its own module and its own
reason to change independently of the others.

### Import

`tools/importer/providers/wcfGeneralLedger.ts` translates one Provider's
payload shape into `Entry` values. It is streaming, not batch: `main.ts`
reads the payload file incrementally (`payloadChunks`, an async generator
over `createReadStream`) and the translator consumes it the same way, so a
5.5MB ledger — or thirty years of data at the brief's stated scale — is never
held as one string in memory. This responsibility owns exactly one thing:
turning Provider vocabulary into Ledger vocabulary. It runs once per Company
per build, never in a browser (ADR-0006), and is the only responsibility that
speaks a Provider's own shape.

### Validation

The zero-sum invariant, argued above under Transaction, is a designed
responsibility rather than a built one: like Transaction itself, it is not
yet in the pipeline `buildReports.ts` runs today, which folds Entries
straight from import into aggregation. It is named as its own service here
because it belongs between import and aggregation, not inside either: it
would decide which of the identifiers import produced are Transactions and
which are quarantined, and its entire observable output would be a count —
Entries accepted into aggregation and Transactions quarantined out of it,
with the sum that damns each quarantined one. No screen would render this
count; it qualifies as dossier material rather than code for the same reason
ADR-0006 gives — "domain logic whose output is not visible on screen is
dossier material rather than code" — before a line of it exists. It is a
distinct responsibility from import because a Provider's shape and the
zero-sum rule change for unrelated reasons — a second Provider needs a new
translator but the same invariant; a stricter invariant (say, requiring a
Journal on every Entry) would change validation without touching any
translator. Its full design — the two-pass streaming algorithm and why a
single forward pass cannot work against this Provider's payload order — is
ticket 05's own dossier topic.

### Aggregation

`tools/importer/reporting/report.ts` (`totalByAccountAndPeriod`,
`buildReport`) groups Entries by reportedAccount and Period, then
matches each Account against a ReportTemplate's CategoryRoots — most specific
prefix wins, via `specificityUnder` in `accountCode.ts` — to place it at
exactly one Category, at the deepest one whose roots claim it. What no
Category claims becomes Unmatched rather than disappearing; what OpeningBalance
Entries mean depends on the ReportTemplate's ReportKind, included in a
BalanceSheet and excluded from a ProfitAndLoss. This is the one responsibility
that knows what a ReportTemplate is; import and validation do not, and could
not — a ReportTemplate is Reporting vocabulary, and Ledger never has one.

### Export

`src/features/reporting/export/buildWorkbook.ts` and `downloadReport.ts`,
inside the application rather than the importer. It is distinct from the
other three in two ways that both follow from where it runs. First, it acts
on the Report already in the browser — the one the user is currently
looking at, potentially a selection of its Categories and Accounts — rather
than on the whole ledger, so it has no reason to live beside build-time
code that never sees a user's selection. Second, it is the one deliberate
place exact decimal strings become IEEE floating-point numbers: a spreadsheet
cell that holds text cannot be summed, so the conversion happens at the cell
boundary and nowhere earlier. Every other service in this system holds money
as an exact value the whole way through; export is where that stops being
possible, because a spreadsheet's own arithmetic starts there.

### Why these four, and not a fifth

There is no persistence service, because there is no database — Report JSON
is produced once at build time and served as static files
([ADR-0007](../adr/0007-static-json-is-the-api-not-msw.md)); a backend
satisfying the same contract is where persistence would live, and the
architecture dossier argues what that looks like. The four responsibilities
above are a pipeline with one direction: a Provider payload becomes Entries,
Entries become an aggregated Report — validation, once built, sitting
between the two without changing their shape — and a Report already on
screen becomes a workbook. Nothing here feeds backward.

## Interface contracts: the API deliverable

Ticket 10 defines the REST contract the frontend consumes — the deliverable
the brief calls for as "the API contract defined explicitly" (story 43) and
"a real backend has a specification to satisfy." It is written twice on
purpose, once as the TypeScript the client codes against
(`src/features/reporting/api/contract.ts`) and once as the language-neutral
version a Kotlin backend could read without being able to import either:
**[docs/api-contract.md](../api-contract.md)**.

That document, not this one, is the API deliverable — repeating its endpoint
table and payload shapes here would drift from it the first time either
changed. What belongs in this dossier is the shape of the commitment: three
endpoints (a Company index, a Company's ReportTemplate index, and a Report),
each returning JSON that is already the aggregated output of the services
model above, and ten numbered rules a payload must satisfy — decimal
amounts never numbers, an Account placed exactly once, a Category's total
equal to its children plus its own Accounts, Unmatched always present, and so
on. Swapping the static files for a real backend is a base-URL change,
because the contract is the URL shape and payload schema, not the mechanism
serving them ([ADR-0007](../adr/0007-static-json-is-the-api-not-msw.md)).

## What comes next

The architectural blueprint, the Kotlin/Spring recommendation, and the
performance analysis this data model implies at scale are argued separately,
in the architecture and performance dossier (ticket 20) — this document
establishes the vocabulary and the service boundaries that argument is built
on.
