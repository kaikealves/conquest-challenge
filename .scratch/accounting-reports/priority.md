# Ticket priority

The order to work the tickets in. **`Blocked by` in a ticket always wins**: if
the next item here is blocked, take the next unblocked one. Status lives in each
ticket file; this file holds only the order and the reasons.

Last set: 2026-09-21. Resolved so far: 01–04, 10–15.

## Order

| Order | Ticket                                            | Why here                                                                                                   |
| ----- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | 27 Real ledger locally                            | The author wants to see real figures in the app. Small, no blockers, and it makes later tickets checkable. |
| 2     | 07 OpeningBalance handling                        | A BalanceSheet from real data is wrong without it.                                                         |
| 3     | 08 CategoryRoot matching rules                    | Real data shows which Accounts the template misses. Gates 09.                                              |
| 4     | 09 Unmatched Accounts surfaced                    | Gates the dossier (19).                                                                                    |
| 5     | 17 Excel export                                   | Required feature.                                                                                          |
| 6     | 16 External API component                         | In the brief; independent.                                                                                 |
| 7     | 18 Memoization pass                               | Small; in the brief.                                                                                       |
| 8     | 05 Zero-sum validation (dossier prose)            | No blockers; feeds the dossier.                                                                            |
| 9     | 19 Dossier: data model and services               | Written once real data has shaped the story. Blocked by 09.                                                |
| 10    | 20 Dossier: architecture and performance          | Blocked by 19.                                                                                             |
| 11    | 21 README                                         | Last of the writing, so it describes the finished thing.                                                   |
| 12    | 06 Auxiliary rollup to ControlAccount             | Importer depth; the app works without it.                                                                  |
| 13    | 26 Import summary page                            | Nice to have.                                                                                              |
| 14    | 22 Prep block (human), 24 Stretch backend (human) | The author's own work.                                                                                     |

## Set aside

- **23 Deploy to Vercel** — `wontfix`. Nothing is published; a reviewer runs the app locally.
- **25 Synthetic ledger** — no longer on the path; it only protected a deployed site. Revive it with 23.

## Standing constraints

- One ticket, one branch, one pull request. The author merges.
- Nothing derived from `brief/` is ever committed. Real figures stay local.
