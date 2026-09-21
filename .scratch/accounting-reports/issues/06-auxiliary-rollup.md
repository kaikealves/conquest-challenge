# 06: Auxiliary rollup to ControlAccount

**What to build:** Entries posted to an AuxiliaryAccount appear in a Report under its ControlAccount, so a Report shows "Customers" rather than one line per customer. This rollup is the translation between the Ledger and Reporting contexts.

**Blocked by:** 04 (Importer tracer).

**Status:** resolved

- [ ] An Entry posted to an AuxiliaryAccount is aggregated under its ControlAccount
- [ ] No AuxiliaryAccount appears anywhere in a Report
- [ ] An Entry posted directly to a Chart of Accounts Account is unaffected
- [x] ~~Auxiliary detection lives on the AccountCode value object~~ — met differently, as the Provider's explicit field read in the translator; see _Delivered_. No string handling at call sites.
- [ ] A test at Seam 1 covers both a customer-side and a supplier-side rollup

## Comments

Moved into `tools/importer/` by ADR-0006, along with the rest of the accounting
logic. The rule and its test are unchanged; only the location is. Seam 1 is now
Provider payload in, Report JSON out, from the tool.

## Delivered, with one deviation

- The Provider says which Account an AuxiliaryAccount rolls up to, in an explicit field. The translator reads that and sets `controlAccount` on the Entry; `reportedAccount(entry)` is the one place a Report picks between them. No AuxiliaryAccount can reach a Report by another route.
- **Deviation from bullet 4:** detection is not on the AccountCode value object. The sample's auxiliary codes start with `0` (customers) or `9` (suppliers), but that is a convention of this chart, not something the Provider promises. Reading the Provider's own field is more reliable than guessing from a prefix, and still keeps string handling out of call sites.
- **Blank name:** the Provider never names the ControlAccount and the sample has no Entry posted to it directly, so a rolled-up line has a blank name rather than one customer's.
- Checked on the real ledger: the BalanceSheet now nets to zero, Result included, in every one of the five FiscalYears (it did not before; the gap was exactly these Entries, per ticket 07).
- A blank Account name shows as a bare code in the Report. That is deliberate and better than one customer's name on the control line; a proper name would need the Chart of Accounts, which this Provider does not send.
- Edge cases pinned by a fixture: a ControlAccount that also has Entries of its own keeps its real name in any order; a whitespace-only field is not an Account; an Account naming itself is ordinary.
