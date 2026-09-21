# Ticket priority

The order to work the tickets in. **`Blocked by` in a ticket always wins**: if
the next item here is blocked, take the next unblocked one. Status lives in each
ticket file; this file holds only the order and the reasons.

Last set: 2026-09-22. Resolved so far: 01–04, 06–15, 17. Ticket 27's pull
request (#15) is open and waiting on the author.

## Order

| Order | Ticket                                            | Why here                                                                                                    |
| ----- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1     | 18 Memoization pass                               | Small; in the brief.                                                                                        |
| 2     | 05 Zero-sum validation (dossier prose)            | No blockers; feeds the dossier.                                                                             |
| 3     | 19 Dossier: data model and services               | Written now that real data has shaped the story. Unblocked since 09 merged.                                 |
| 4     | 20 Dossier: architecture and performance          | Blocked by 19.                                                                                              |
| 5     | 21 README                                         | Last of the writing, so it describes the finished thing. Must say which component satisfies the API bullet. |
| 6     | 26 Import summary page                            | Nice to have.                                                                                               |
| 7     | 22 Prep block (human), 24 Stretch backend (human) | The author's own work.                                                                                      |

## Set aside

- **16 External API component** — `wontfix`. The brief's JSONPlaceholder is an example ("e.g."); the Report screen is the component that fetches from a mock API with loading and error states. Ticket 21 says so.
- **23 Deploy to Vercel** — `wontfix`. Nothing is published; a reviewer runs the app locally.
- **25 Synthetic ledger** — no longer on the path; it only protected a deployed site. Revive it with 23.

## Standing constraints

- One ticket, one branch, one pull request. The author merges.
- Nothing derived from `brief/` is ever committed. Real figures stay local.
