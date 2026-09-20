# Shared

Code owned by no bounded context — value objects and utilities used identically
by both Ledger and Reporting, plus application-wide UI primitives.

Unlike the feature directories, this one is organised by technical layer
internally (`ui/`, `lib/`, and so on). That is the one place where layer
organisation earns its keep. See
[ADR-0004](../../docs/adr/0004-feature-first-source-layout.md).

Anything with a single feature owner belongs in that feature's directory, not
here.
