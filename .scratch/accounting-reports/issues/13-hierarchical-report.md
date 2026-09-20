# 13: Hierarchical Report

**What to build:** The Report becomes navigable. A Category expands to reveal nested Categories and the Accounts within them, to arbitrary depth, so a user can investigate a figure that looks wrong.

**Blocked by:** 11 (Report fetched and rendered).

**Status:** ready-for-agent

- [ ] A Category expands to show its children and collapses again
- [ ] Nesting works to arbitrary depth, not a fixed two levels
- [ ] Accounts show both AccountCode and name
- [ ] A hand-rolled recursive component is used rather than a table library, per the spec
- [ ] Expansion state is keyboard accessible
- [ ] An end-to-end test expands a Category and asserts its Accounts appear
