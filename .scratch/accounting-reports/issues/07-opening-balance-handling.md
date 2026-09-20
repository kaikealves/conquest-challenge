# 07: OpeningBalance handling

**What to build:** Reports treat carried-forward balances correctly. A BalanceSheet includes OpeningBalance Entries; a ProfitAndLoss excludes them, so each FiscalYear's Result reflects only that year's activity.

**Blocked by:** 04 (Importer tracer).

**Status:** ready-for-agent

- [ ] An OpeningBalance Entry is identifiable in the domain model as a named concept
- [ ] A BalanceSheet includes OpeningBalance Entries
- [ ] A ProfitAndLoss excludes OpeningBalance Entries
- [ ] A fixture containing both an OpeningBalance and ordinary Entries proves the two Reports differ as expected
- [ ] Assets equal liabilities in the BalanceSheet once Result is included

## Comments

Moved into `tools/importer/` by ADR-0006, along with the rest of the accounting
logic. The rule and its test are unchanged; only the location is. Seam 1 is now
Provider payload in, Report JSON out, from the tool.
