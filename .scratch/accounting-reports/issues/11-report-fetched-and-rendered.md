# 11: Report fetched and rendered

**What to build:** A Report appears on screen. It is fetched over HTTP through TanStack Query per ADR-0005 and rendered as a flat list of Categories with their totals — the first thing a user can actually look at.

**Blocked by:** 10 (Mock API contract).

**Status:** ready-for-agent

- [ ] TanStack Query owns the server state; no data fetching in effects
- [ ] Categories render with correct labels and totals
- [ ] Amounts are formatted consistently with their currency
- [ ] Debit and credit are distinguishable at a glance
- [ ] Component and type names use the vocabulary from the Reporting glossary
- [ ] A component test asserts the rendered totals match the fixture
