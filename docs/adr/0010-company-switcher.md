---
status: accepted
supersedes: ADR-0009 (in part)
---

# Company becomes a real, selectable, database-shaped entity

## Context

[ADR-0009](./0009-company-is-a-shared-passthrough.md) deliberately built no
Company selector: there was one real Company's ledger, and building a picker
with one option isn't a picker. The user asked what switching Companies would
take, then asked for it built.

ADR-0009's _shared-passthrough_ reasoning — Company crosses the Ledger →
Reporting boundary unchanged, so it has one definition rather than two — still
holds and is not revisited here. What changes is the "no selector" half and the
"just a name, nothing speculative" half of Company's shape.

Asked what fields a real Company would have, the user's own framing was: it
will be a database row, so shape it like one.

## Decision

**`Company` gains `id` (a stable slug, independent of `name`) and `country`
(ISO 3166-1 alpha-2)**, mirroring `ReportTemplate`'s own `id`/`name` split and
matching how `Report.currency` is already documented as ISO 4217 rather than
free text.

`country` is not decorative. **`ReportTemplate` gains a `country` too, and the
importer builds a Report only for templates whose country matches the Company
it is importing for.** Before this, `loadTemplates()` read every `*.json` file
in `tools/importer/templates/` and built a Report from every one of them,
against whatever single payload it was given — correct only because every
template so far shared one chart-of-accounts convention. A second, differently
countried template sitting in the same directory would otherwise silently be
built against the wrong ledger's AccountCodes: a UK template's `4xxxxx` revenue
root would happily match French AccountCodes that mean something else entirely,
producing a Report that looks plausible and is wrong. `country` is what the
importer now uses to know a template does not apply.

**The second Company's chart is genuinely different, not just differently
numbered.** The brief gives country as the reason charts of accounts vary
("French revenue accounts start with 7, whereas UK revenue accounts usually
start with 4"); a second Company with the same category structure and new
numbers would not demonstrate that, only repaint it. A small synthetic UK-style
fixture and ReportTemplate exist for exactly this reason — synthetic, because
there is no second real ledger, the same reasoning ADR-0009 already gave for
not fabricating this data speculatively. It stops being speculative once there
is a concrete feature that needs it.

**Company joins the URL**, `/companies/:companyId/reports/:templateId/:period`,
on the same terms ReportTemplate and Period already do: a bare or partial
address is completed by redirect, never guessed at, so a link stays exactly as
shareable as it already was.

**Switching Company does not try to keep the current ReportTemplate or
Period.** Ticket 15 keeps the Period across a ReportTemplate change because
both draw from the same Company's data and the Period concept transfers
directly. Across Companies with unrelated charts, "keep the same
ReportTemplate id" has no general meaning — it would work by coincidence, not
by design. Switching Company always lands on its bare address and lets
resolution rebuild ReportTemplate and Period from there, the same as any other
incomplete address.

**The importer's CLI moves from positional-only to positional-plus-flags:**
`tsx tools/importer/main.ts <payload.xml> <output-root> --country=<CC>
[--company-id=<id>] [--company-name=<name>]`. Payload and output root stay
positional — fundamental, always given. `country` has no derivation (nothing
about a payload's filename says what jurisdiction its chart follows) and is
required. `company-id` and `company-name` stay optional, derived from the
payload's filename when omitted, as ADR-0009 established — that reasoning is
unchanged, just now covering one more field.

**`<output-root>` changes meaning**: from "where this Company's own tree goes"
to "the shared data root a run writes its Company's tree beneath"
(`{root}/companies/{companyId}/...`), plus an upsert of `{root}/companies.json`
so a second import does not erase the first's entry. Each run still only
touches its own Company's subtree — a previous run's `reports/` is still
cleared before writing, now scoped to `{root}/companies/{companyId}/reports/`
rather than `{root}/reports/`.

## Considered Options

- **Keep one Company, offer no selector.** ADR-0009's original position.
  Superseded because the user asked for the feature, not because the original
  reasoning was wrong for its time.
- **A selector with identical charts across Companies, different figures
  only.** Rejected: cheaper, but demonstrates nothing the brief's own
  chart-of-accounts-by-country reasoning is about, and would read as
  decoration rather than as an answer to "why would a ReportTemplate ever
  differ."
- **Company as a query parameter rather than a path segment.** Rejected for
  consistency: ReportTemplate and Period are both path segments precisely so
  an address is the whole of what a colleague needs, and a query parameter
  would be an unexplained exception to that rule for no benefit.
- **Keep the importer's CLI positional-only, adding more positional
  arguments.** Rejected once a required `country` joined two already-optional
  arguments: a caller cannot skip a positional argument to reach one after it,
  so `country` would have had to come before `company-name`, silently changing
  what an existing invocation with three positional arguments means. Flags
  make an omitted argument omittable regardless of position.

## Consequences

- Every place `Company` or `ReportTemplate` is constructed — the importer, the
  mock handlers, and test fixtures at both seams — needs `country` (and, for
  `Company`, `id`). This is the same shape of change ticket 29's `company`
  field and ticket 09's `unmatched` field were; the type system finds most of
  it.
- A ReportTemplate written without a `country` is as much a contract violation
  as one written without a `kind` (ticket 07) — refused at import time for the
  same reason: silently treating it as applicable everywhere is exactly the
  bug this ADR exists to prevent.
- If a third Company sharing an existing country's chart is ever added, no
  further change is needed here — `country` already answers "which templates
  apply," not "which Company."
