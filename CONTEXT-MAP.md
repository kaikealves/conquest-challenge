# Context Map

Accounting data is imported from external providers, stored, and summarised into
reports. Two bounded contexts divide that work, and the same word means different
things either side of the boundary.

## Contexts

- [Ledger](./src/features/ledger/CONTEXT.md): receives accounting data from
  external providers and holds it as balanced double-entry Transactions.
- [Reporting](./src/features/reporting/CONTEXT.md): aggregates Entries into
  Categories to produce a BalanceSheet or a ProfitAndLoss.

## Relationships

- **Provider → Ledger**: the importer is an **anti-corruption layer**. Provider
  vocabulary (`wsGeneralLedger`, `collectif`, `letteredInBetween`, `voucherRef`)
  is translated at the boundary and never enters the domain model. See
  [ADR-0002](./docs/adr/0002-importer-is-an-anti-corruption-layer.md).

- **Ledger → Reporting**: the translation is the **auxiliary rollup**. An
  AuxiliaryAccount is a real posting target in Ledger, but does not exist in
  Reporting — it is replaced by its ControlAccount before any Entry is
  aggregated. This is why "Account" needs two definitions rather than one shared
  one. See [ADR-0001](./docs/adr/0001-ledger-and-reporting-bounded-contexts.md).

- **Shared**: `AccountCode` and `Money` are value objects used by both contexts
  with identical meaning.
