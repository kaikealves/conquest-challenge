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

## Delivered, with one known gap

Categories start collapsed and each row owns its own open/closed state. The
expand control is a `<button aria-expanded>`, so keyboard and screen-reader
users get the state for free.

**Gap:** depth is shown by indentation only. A screen-reader user cannot tell
how deep a row sits or whether it is an Account or a sub-Category. Plain
`<tr>` cannot take `aria-level`; fixing it properly means moving to the ARIA
`treegrid` pattern with arrow-key navigation, which is a bigger change than
this ticket. Decide at the accessibility pass before shipping.
