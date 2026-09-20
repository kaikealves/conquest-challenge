# 09: Unmatched Accounts surfaced

**What to build:** An incomplete ReportTemplate is visible rather than quietly losing money. Accounts matched by no Category are collected and shown instead of dropped.

**Blocked by:** 08 (CategoryRoot matching rules).

**Status:** ready-for-agent

- [ ] Accounts matched by no CategoryRoot are collected into an explicit unmatched group
- [ ] The unmatched group carries its total so a discrepancy is quantifiable
- [ ] A Report with a complete ReportTemplate shows an empty unmatched group rather than omitting it
- [ ] A test proves an amount cannot disappear between the ledger and the Report
