---
status: accepted
supersedes: ADR-0001 (in part)
---

# The importer is a tool outside the application

All accounting logic — parsing a Provider payload, Money, AccountCode,
aggregation, the auxiliary rollup — lives in `tools/importer/`, a standalone Node
tool with its own tsconfig. `src/` holds the React application and nothing else.
The importer emits static JSON; the application fetches it and renders it, and
owns no domain logic at all.

This supersedes the consequence in
[ADR-0001](./0001-ledger-and-reporting-bounded-contexts.md) that "the two
contexts are the two top-level directories under `src/features/`". The two
bounded contexts still stand, and so does the auxiliary rollup as the translation
between them; only their location changes. Ledger now lives entirely in the tool,
because nothing in it ever runs in a browser.

## Considered Options

Keeping the importer under `src/features/ledger` was the original choice, so that
the source layout mirrored the context map. It was tree-shaken out of the bundle
and cost nothing at runtime — but that was invisible to a reader. Roughly 500
lines of build-time code sat in the application's source tree, and the first
person to look concluded the React app was bloated with backend work. A layout
whose one job is to communicate structure had actively misled.

## Consequences

- The React application receives Reports already computed and needs no Money or
  AccountCode of its own. Currency formatting is `Intl.NumberFormat` over a
  decimal string; the Excel export converts to a number at the cell boundary.
- The tool is an executable specification of what a backend importer must do,
  which is what the dossier argues in prose.
- Domain logic whose output is not visible on screen is dossier material rather
  than code. The zero-sum invariant is the case in point: its entire observable
  result is a count of accepted and quarantined Transactions.
