# 07: OpeningBalance handling

**What to build:** Reports treat carried-forward balances correctly. A BalanceSheet includes OpeningBalance Entries; a ProfitAndLoss excludes them, so each FiscalYear's Result reflects only that year's activity.

**Blocked by:** 04 (Pipeline tracer).

**Status:** ready-for-agent

- [ ] An OpeningBalance Entry is identifiable in the domain model as a named concept
- [ ] A BalanceSheet includes OpeningBalance Entries
- [ ] A ProfitAndLoss excludes OpeningBalance Entries
- [ ] A fixture containing both an OpeningBalance and ordinary Entries proves the two Reports differ as expected
- [ ] Assets equal liabilities in the BalanceSheet once Result is included
