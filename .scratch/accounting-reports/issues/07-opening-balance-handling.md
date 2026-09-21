# 07: OpeningBalance handling

**What to build:** Reports treat carried-forward balances correctly. A BalanceSheet includes OpeningBalance Entries; a ProfitAndLoss excludes them, so each FiscalYear's Result reflects only that year's activity.

**Blocked by:** 04 (Importer tracer).

**Status:** resolved

- [ ] An OpeningBalance Entry is identifiable in the domain model as a named concept
- [ ] A BalanceSheet includes OpeningBalance Entries
- [ ] A ProfitAndLoss excludes OpeningBalance Entries
- [ ] A fixture containing both an OpeningBalance and ordinary Entries proves the two Reports differ as expected
- [ ] Assets equal liabilities in the BalanceSheet once Result is included

## Comments

Moved into `tools/importer/` by ADR-0006, along with the rest of the accounting
logic. The rule and its test are unchanged; only the location is. Seam 1 is now
Provider payload in, Report JSON out, from the tool.

## Delivered, with scope added

- An Entry carries `openingBalance`, set by the Provider translator: this Provider's journal `ref` equal to `AN`. Verified locally on the sample: such Entries are all dated 1 January, sit only on balance-sheet Accounts, and each FiscalYear's set nets to zero.
- A ReportTemplate declares its `kind` (BalanceSheet or ProfitAndLoss); a template without one is refused.
- A BalanceSheet template may declare a `result`: revenue and expense Accounts summed into one Category, so the BalanceSheet's Categories net to zero.
- **Added to the ticket:** the two ReportTemplates the real ledger needed, `french-profit-and-loss` and `french-balance-sheet` (renamed from `french-chart`).

**Known, and not this ticket:** on the real ledger the BalanceSheet does not yet net to zero. The whole shortfall is auxiliary Accounts (customers under `0…`, suppliers under `9…`) that match no Category until ticket 06 rolls them up to their ControlAccount. Checked with an independent Python implementation: importer totals match it exactly, and the unmatched auxiliary Entries equal the imbalance to the cent in every FiscalYear. Ticket 06 should move ahead of 08 and 09.

**Simplifications in the BalanceSheet template, deliberate for a first cut** (found in review; not reworked here): Categories are by class prefix, so mixed-sign Accounts are netted on one side. 41 can hold customer advances (419) and 40 supplier debits (409); 44 nets deductible against collected VAT; 46–48 sit wholly under liabilities though 486 (prepaid expenses) is an asset; 49 (provisions against receivables) is a contra-asset under liabilities; 519 (bank overdraft) is netted into Cash. Class 8 is unmapped. If the ledger ever holds year-end closing entries into class 12, the Result would be counted twice. Ticket 09 shows what a template misses; a proper split by balance sign is dossier material.
