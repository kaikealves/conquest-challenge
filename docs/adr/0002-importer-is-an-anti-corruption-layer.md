# The importer is an anti-corruption layer

The sample provider is a WCF REST service whose payload carries its own
vocabulary — `wsGeneralLedger`, `collectif`, `letteredInBetween`, `voucherRef`,
`journalIndex`. The brief anticipates tens of such providers, so the importer
translates provider shapes into the domain model at the boundary, and no provider
term is permitted past it.

## Consequences

- Adding a provider means adding one translator, not touching reporting code.
- The importer runs as a build-time script producing report JSON, so the 5.5MB
  ledger never reaches the browser. It is an executable specification of what a
  future backend importer must do.
