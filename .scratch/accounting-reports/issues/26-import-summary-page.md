# 26: Import summary page

**What to build:** A page showing what the import did, so build-time work is visible in the browser.

**Blocked by:** 10 (The REST contract as static JSON).

**Status:** ready-for-agent

- [ ] The importer records a summary alongside the Reports: Entries read, Accounts found, AuxiliaryAccounts rolled up, Periods available, Accounts matched by no Category
- [ ] A page fetches and displays it, on its own route
- [ ] Figures are labelled in the domain's vocabulary, not the tool's
- [ ] The page states when the import ran and which Provider payload it read

## Comments

Created by ADR-0006. Moving the accounting logic into a tool made it invisible to
anyone who only opens the deployed site — and the brief's grading weight is on
the frontend, so logic a reviewer never sees is logic that may as well not exist.

This page is the cheapest fix: it turns "29 AuxiliaryAccounts rolled up into
their ControlAccounts" into something on screen. It is also the natural home for
the unmatched Accounts of ticket 09, which otherwise have nowhere to be seen.
