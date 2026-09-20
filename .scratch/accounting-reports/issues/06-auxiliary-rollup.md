# 06: Auxiliary rollup to ControlAccount

**What to build:** Entries posted to an AuxiliaryAccount appear in a Report under its ControlAccount, so a Report shows "Customers" rather than one line per customer. This rollup is the translation between the Ledger and Reporting contexts.

**Blocked by:** 04 (Pipeline tracer).

**Status:** ready-for-agent

- [ ] An Entry posted to an AuxiliaryAccount is aggregated under its ControlAccount
- [ ] No AuxiliaryAccount appears anywhere in a Report
- [ ] An Entry posted directly to a Chart of Accounts Account is unaffected
- [ ] Auxiliary detection lives on the AccountCode value object, not as string handling at call sites
- [ ] A test at Seam 1 covers both a customer-side and a supplier-side rollup
