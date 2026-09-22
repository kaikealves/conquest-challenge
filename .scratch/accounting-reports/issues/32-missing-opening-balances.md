# 32: Flag a BalanceSheet that carried nothing forward

**What to build:** A BalanceSheet for a FiscalYear with no OpeningBalance
Entries, where the ledger holds an earlier FiscalYear, says on screen that its
figures are that year's movements rather than balances.

**Blocked by:** 07 (OpeningBalance handling).

**Status:** resolved

- [x] The importer sets `missingOpeningBalances` on each Report: true only for a
      BalanceSheet whose Period has no OpeningBalance Entries and follows an
      earlier Period
- [x] A ProfitAndLoss, and the ledger's first Period, are never flagged
- [x] The application shows a notice above a flagged Report's figures
- [x] A payload without the field is read as not flagged
- [x] `docs/api-contract.md` documents the field

## Comments

Found reviewing `npm run dev:real` before submission. The sample ledger was
exported mid-June 2017 and has no journal `AN` for 2017, so its 2017
BalanceSheet, which the application opens on by default, showed Assets as a net
credit and Fixed assets holding only accumulated depreciation. It still netted to
zero, which is why nothing caught it.

The user chose this quick fix over the full one: rolling the previous
FiscalYear's closing balances forward when a year carries none. That fix belongs
in the importer and is the natural follow-up; the flag stays useful after it,
for a year with no predecessor in the ledger to roll from.
