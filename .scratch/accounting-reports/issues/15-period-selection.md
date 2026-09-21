# 15: Period selection

**What to build:** The user chooses the Period a Report covers, so one FiscalYear can be compared against another. Like the ReportTemplate, the Period lives in the URL.

**Blocked by:** 14 (ReportTemplate selection).

**Status:** ready-for-agent

- [ ] A Period is selectable and re-renders the Report
- [ ] The chosen Period is reflected in the URL alongside the ReportTemplate
- [ ] An invalid Period produces a clear message rather than an error state
- [ ] A BalanceSheet respects the point in time; a ProfitAndLoss respects the range — **importer work, not UI** (ADR-0006): the client receives a computed Report for a Period and cannot tell the two kinds apart. Delivered by ticket 07 (OpeningBalance handling) and the importer's Period logic, not by this ticket.
- [ ] An end-to-end test changes Period and asserts the totals change
