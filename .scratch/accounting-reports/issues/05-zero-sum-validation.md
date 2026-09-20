# 05: Zero-sum validation and quarantine

**What to build:** Corrupt accounting data cannot reach a Report. A Transaction whose Entries do not sum to zero is rejected with a reason rather than silently dropped or silently included.

**Blocked by:** 04 (Pipeline tracer).

**Status:** ready-for-agent

- [ ] Transaction is the aggregate root and owns the zero-sum invariant; Entries cannot be created except through it
- [ ] A Transaction whose Entries sum to zero is accepted
- [ ] A Transaction whose Entries do not sum to zero is quarantined, not discarded
- [ ] Each quarantined Transaction carries a reason identifying what failed
- [ ] The import reports how many Transactions were accepted and how many quarantined

## Comments

**Found in ticket 04, before starting this one: the payload cannot be grouped
into Transactions by a single forward pass.**

The Provider sorts its payload by Account, not by Transaction. In the sample
ledger, 6774 Entries carry 1202 distinct transaction identifiers but arrive as
6536 contiguous runs — a Transaction is left and re-opened 5334 times, and the
largest spans 604 Entries scattered across the document. Ticket 04 originally
grouped Entries by "emit when the identifier changes", which would have produced
6536 pseudo-Transactions, almost none of them summing to zero. This ticket would
then have quarantined nearly the whole ledger and the cause would have looked
like bad data rather than a bad assumption.

That grouping was removed rather than left to mislead. The importer yields
Entries; Transaction does not exist yet, and defining it is this ticket's first
job.

The tension to resolve is with story 27, "the import should stream rather than
load the whole payload". Holding every Entry until the document ends is
O(Entries) and defeats it. One resolution that keeps both properties:

1. Stream once, accumulating only a running sum per transaction identifier —
   memory is O(Transactions), 1202 here rather than 6774, and no Entry is held.
2. The identifiers whose sum is non-zero are the quarantined set, with the sum
   itself as the reason.
3. Stream a second time, folding Entries into Account totals and skipping any
   Entry belonging to a quarantined Transaction.

Two passes over the payload, memory proportional to Transactions plus Accounts,
and never to Entries. Worth weighing against simply buffering, and worth
recording in the dossier either way — it is a genuine consequence of the
Provider's shape rather than an implementation detail.
