# 05: Zero-sum validation and quarantine

**What to build:** Corrupt accounting data cannot reach a Report. A Transaction whose Entries do not sum to zero is rejected with a reason rather than silently dropped or silently included.

**Blocked by:** 04 (Pipeline tracer).

**Status:** ready-for-agent

- [ ] Transaction is the aggregate root and owns the zero-sum invariant; Entries cannot be created except through it
- [ ] A Transaction whose Entries sum to zero is accepted
- [ ] A Transaction whose Entries do not sum to zero is quarantined, not discarded
- [ ] Each quarantined Transaction carries a reason identifying what failed
- [ ] The import reports how many Transactions were accepted and how many quarantined
