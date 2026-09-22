# Context Map

Accounting data is imported from external providers, summarised into Reports, and
presented. Two bounded contexts divide that work, and the same word means
different things either side of the boundary.

## Contexts

- [Ledger](./tools/importer/CONTEXT.md): receives accounting data from external
  providers and holds it as Entries posted to Accounts. Lives entirely in
  `tools/importer/`, because nothing in it ever runs in a browser.
- [Reporting](./src/features/reporting/CONTEXT.md): aggregates Entries into
  Categories to produce a BalanceSheet or a ProfitAndLoss. Split across the
  boundary: the aggregation runs in the importer, the presentation in the React
  application.

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

- **Reporting → the application**: a Report crosses as JSON over HTTP. The
  application holds no domain model of its own; it renders Categories and
  Accounts that arrive already aggregated, with amounts as exact decimal strings.
  See [ADR-0006](./docs/adr/0006-importer-is-a-tool-outside-the-application.md)
  and [ADR-0007](./docs/adr/0007-static-json-is-the-api-not-msw.md).

- **Shared**: `AccountCode` and `Money` are value objects of the importer. They
  do not exist in the application, which receives computed decimal strings rather
  than amounts it must do arithmetic on.

- **Shared, and crossing the boundary**: **Company** — the accounting entity
  whose ledger is being imported — is supplied when the importer runs and
  carried through to the application unchanged, on both `ReportTemplateIndex`
  and `Report`. Unlike `AccountCode` and `Money`, it is not reinterpreted at any
  boundary, so it gets one definition rather than two: whatever import receives
  is exactly what a Report and the page display. See
  [ADR-0009](./docs/adr/0009-company-is-a-shared-passthrough.md).
