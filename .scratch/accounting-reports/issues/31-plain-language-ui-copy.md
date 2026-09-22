# 31: Plain-language UI copy

**What to build:** Every string a user reads is written in plain English. The
glossary terms (`BalanceSheet`, `ProfitAndLoss`, `ReportTemplate`, `Category`,
`Period`) name types, components and tests; they do not appear as CamelCase or
capitalised jargon on screen.

**Blocked by:** None.

**Status:** resolved

- [x] The page header is a human title and subtitle
- [x] The browser tab title matches the header
- [x] Loading, empty, error and not-found messages use plain words
- [x] The unmatched-accounts notice uses plain words
- [x] Tests assert the new wording

## Comments

Raised by the user on reviewing the running app before submission: the header
read "A BalanceSheet and a ProfitAndLoss, aggregated into Categories by a
ReportTemplate."

Also fixes a race in `e2e/company-selection.spec.ts`: it asserted the
intermediate address `/companies/beta-co`, which the page replaces with the full
Report address as soon as the ReportTemplates load, so it failed whenever that
load was fast.
