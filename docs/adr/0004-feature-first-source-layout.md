# Feature-first source layout

Source is organised by feature (`src/features/ledger`, `src/features/reporting`)
with a `src/shared` layer for code that has no feature owner, rather than by
technical layer (`components/`, `hooks/`, `api/`). Feature directories are the
codebase expression of the bounded contexts in
[ADR-0001](./0001-ledger-and-reporting-bounded-contexts.md).

## Considered Options

A layer-first layout was the initial preference and is genuinely defensible at
this size. It was rejected for three reasons that outlast the prototype: a
feature change touches one directory instead of five; deleting a feature is
removing a directory rather than hunting orphans; and cross-feature imports
become visible and lintable rather than indistinguishable from any other import.

## Consequences

- `src/shared` is organised by layer internally — that is where layer
  organisation genuinely earns its keep.
