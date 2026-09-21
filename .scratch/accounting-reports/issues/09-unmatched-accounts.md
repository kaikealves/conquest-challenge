# 09: Unmatched Accounts surfaced

**What to build:** An incomplete ReportTemplate is visible rather than quietly losing money. Accounts matched by no Category are collected and shown instead of dropped.

**Blocked by:** 08 (CategoryRoot matching rules).

**Status:** resolved

- [ ] Accounts matched by no CategoryRoot are collected into an explicit unmatched group
- [ ] The unmatched group carries its total so a discrepancy is quantifiable
- [ ] A Report with a complete ReportTemplate shows an empty unmatched group rather than omitting it
- [ ] A test proves an amount cannot disappear between the ledger and the Report

## Comments

Moved into `tools/importer/` by ADR-0006, along with the rest of the accounting
logic. The rule and its test are unchanged; only the location is. Seam 1 is now
Provider payload in, Report JSON out, from the tool.

## Delivered

- Every Report has an `unmatched` group (a Category with no children): the Accounts no Category and not the Result claimed, with their total. It is never omitted; a complete template sends it empty at `0.00`.
- A test sums the top-level Categories and `unmatched` for every fixture and compares that to the ledger's own net, read straight from the payload by an independent parser: nothing can disappear.
- **Scope, added while doing it:** a ProfitAndLoss has no business with balance-sheet Accounts, so on the first real run every ProfitAndLoss reported 30–50 "unmatched" balance-sheet Accounts, which was noise. A template may declare a `scope` (CategoryRoots it answers for); only in-scope, unclaimed Accounts are unmatched. Both shipped templates declare one.
- **What the group found on the real ledger:** the French ProfitAndLoss template had no Category for classes 67/77 (exceptional), 68/78 (depreciation and provisions) or 69 (income tax). The largest, depreciation, was several hundred thousand euros a year. Added: _Depreciation and provisions_ under Operating expenses, _Exceptional_ and _Income tax_. Afterwards the group is empty in all five FiscalYears, and the ProfitAndLoss's Categories net to exactly the BalanceSheet's Result in each — the reconciliation the spec asks for.
- The client shows the group as a row after the Categories, and a notice with the count and total when it is not empty. A Report with no Categories but money unmatched is still shown.
