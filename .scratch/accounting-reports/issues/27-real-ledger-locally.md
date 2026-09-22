# 27: See the real ledger in the running app, locally

**What to build:** A way to run the application against the Reports the importer computes from the real sample ledger, on the author's machine only. Today `npm run dev` always answers `/data/` with MSW's invented figures, so the real numbers can be produced (`npm run import -- brief/brignolles-gl.xml public/data`) but never seen.

**Blocked by:** None.

**Status:** resolved

- [ ] A documented command runs the importer over the sample and starts the dev server with the mock API switched off, so `/data/` serves the importer's files from `public/data/`
- [ ] The default `npm run dev` is unchanged: still MSW, still no importer needed
- [ ] The importer output stays gitignored (`public/data/` already is); nothing derived from `brief/` is committed
- [ ] The application says nothing about which source it is on unless it fails; a missing `public/data` produces the ordinary error state, not a blank page
- [ ] A short note in the README plan (ticket 21) or `docs/` says how to do it, and why it is local-only

## Notes

Why a switch and not a change of default: tests and quick contributor work want the mock, and the real ledger must never be the thing a fresh clone depends on (the sample is a third party's record and is not in the repo).

The real data is a ProfitAndLoss shape only until tickets 07 (OpeningBalance), 08 (CategoryRoot matching) and 09 (unmatched Accounts) land. Seeing it early is the point: it is how those tickets get checked against something real.

## Delivered, with two deviations

- Output goes to gitignored `.local/real-ledger/`, not `public/data/`: a build copies `public/` into `dist/`, so real figures there would ship. `vite build --mode real` refuses to run for the same reason.
- Not tested: the missing-data-directory case for real mode specifically. The Report error state it would show is covered by ticket 12's tests.

Details in `docs/real-ledger-locally.md`.
