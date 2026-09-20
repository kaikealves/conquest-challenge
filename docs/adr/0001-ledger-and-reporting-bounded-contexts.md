# Ledger and Reporting are separate bounded contexts

The word "Account" provably means two different things in this domain: in the
accounting record, `0EDF` is a real posting target belonging to the customer
sub-ledger; in any report, it does not exist, having been rolled up into its
ControlAccount `411100`. Rather than forcing one shared definition, we split
Ledger and Reporting into separate contexts and treat the auxiliary rollup as the
translation between them.

## Consequences

- Reporting code never handles an AuxiliaryAccount, so the 580 sub-ledger entries
  in the sample data cannot scatter across 26 meaningless buckets.
- ~~The two contexts are the two top-level directories under `src/features/`, so
  the source layout is the context map.~~ Superseded by
  [ADR-0006](./0006-importer-is-a-tool-outside-the-application.md): Ledger lives
  in `tools/importer/` and Reporting's display concerns in `src/`. The split into
  two contexts, and the rollup between them, still stand.
