# 05: Zero-sum validation — dossier topic

**What to build:** Nothing in code. This is a design argued in the dossier.

**Blocked by:** None.

**Status:** resolved

- [x] The dossier explains the zero-sum invariant and why a Transaction is the unit that owns it
- [x] It records why this Provider's payload cannot be grouped into Transactions in one forward pass
- [x] It gives a design that validates the invariant without abandoning streaming
- [x] It states what a backend would do differently, having a database rather than a stream

## Comments

Reclassified from code to prose. The entire observable output of zero-sum
validation is a count — "1202 accepted, 0 quarantined" — which no user sees and
no screen renders. The engineering is real, but it argues better than it
demonstrates.

**The finding that drove this.** The Provider sorts its payload by Account, not
by Transaction. In the sample ledger, 6774 Entries carry 1202 distinct
transaction identifiers but arrive as 6536 contiguous runs: a Transaction is left
and re-opened 5334 times, and the largest spans 604 Entries scattered across the
document. The obvious implementation — emit a Transaction when the identifier
changes — produces 6536 fragments, almost none summing to zero, and would have
quarantined nearly the whole ledger while looking like bad data.

**The design to argue.** Holding every Entry until the document ends is
O(Entries) and abandons streaming. Instead:

1. Stream once, accumulating only a running sum per transaction identifier —
   memory is O(Transactions), 1202 here rather than 6774, and no Entry is held.
2. The identifiers whose sum is non-zero are the quarantined set, with the sum
   itself as the reason.
3. Stream a second time, folding Entries into Account totals and skipping any
   Entry belonging to a quarantined Transaction.

Two passes, memory proportional to Transactions plus Accounts and never to
Entries. A backend importing into a database would not need this: it would insert
Entries, then validate with a `GROUP BY` having a non-zero sum. That contrast is
worth stating — the constraint comes from streaming a file, not from the domain.

## Delivered

Written as §4.6 of dossier part 1, "Checking the zero-sum rule when the
payload is out of order". The finding is stated without the sample's own
figures, which stay out of the repository. Part 2 already covered the backend's
set-based check; §4.6 links to it rather than repeating it.
