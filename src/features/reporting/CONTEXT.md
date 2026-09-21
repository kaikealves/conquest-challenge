# Reporting

Aggregates Entries into Categories to produce summarised reports. This context
never sees an AuxiliaryAccount: those are replaced by their ControlAccount at the
boundary, so every Account here is a real Chart of Accounts Account.

## Language

**Report**:
A summary of Entries aggregated into Categories over a Period, shaped by a
ReportTemplate.
_Avoid_: statement, output, view

**BalanceSheet**:
A Report of the balance-sheet Accounts at a point in time, in which assets equal
liabilities. Includes OpeningBalance Entries.
_Avoid_: balance, BS, position

**ProfitAndLoss**:
A Report of revenue and expense Accounts over a Period. Excludes OpeningBalance
Entries.
_Avoid_: P&L, PnL, income statement, earnings

**ReportKind**:
Whether a Report is a BalanceSheet or a ProfitAndLoss. It decides how a
carried-forward balance is treated: a BalanceSheet includes OpeningBalance
Entries, a ProfitAndLoss excludes them. Every ReportTemplate declares one.
_Avoid_: statement, type, mode

**Category**:
One labelled line of a Report, holding every Account matched by its
CategoryRoots.
_Avoid_: group, bucket, section, heading

**CategoryRoot**:
An AccountCode prefix that decides whether an Account belongs to a Category.
_Avoid_: root, prefix, mask, pattern

**ReportTemplate**:
An ordered set of Categories defining the shape of a Report for one Chart of
Accounts.
_Avoid_: layout, mapping, config, schema

**Period**:
The date range a Report covers.
_Avoid_: range, date range, timeframe, window

**Result**:
Revenue minus expenses over a Period. The figure that reconciles a ProfitAndLoss
to a BalanceSheet. A BalanceSheet shows it as its own Category, taken with the
ledger's sign (a profit is a credit, so negative), which is what makes the
BalanceSheet's Categories net to zero. It lists the revenue and expense Accounts
it is made of.
_Avoid_: profit, net income, earnings, bottom line

## Note on Period identifiers

Today a Period is identified by a calendar-year string (`2016`), which is
effectively a FiscalYear key. The API contract treats it as opaque — the client
never parses or orders it beyond the index's ascending list — so a Period that
is not a whole year would need no client change.
