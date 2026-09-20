# 25: Synthetic ledger for the deployed demo

**What to build:** A committed Provider payload, shaped like the real one, carrying invented figures. It is what the deployed site's data is built from.

**Blocked by:** 04 (Importer tracer).

**Status:** ready-for-agent

- [ ] A generator script produces a Provider payload in the real Provider's XML shape
- [ ] It covers the structures the rules need: auxiliary accounts with control accounts, opening balance entries, accounts whose codes are unusually short and long, and accounts no Category matches
- [ ] Transactions balance to zero, so the data is credible accounting
- [ ] It spans several FiscalYears, so Period selection has something to select
- [ ] No party name, figure or identifier is taken from the supplied sample
- [ ] The generated payload is committed; the generator is rerunnable

## Comments

The supplied ledger is a third party's real accounting record — real balances,
real counterparties. Deploying a site built from it would publish their books, so
the demo runs on invented data. The real file stays local and the README shows
its real numbers for anyone holding it.

This is not only a privacy measure. A second Chart of Accounts exercised by the
same importer, with no code change, is the brief's "different charts of accounts"
requirement demonstrated rather than asserted — so the synthetic chart should
differ in shape from the French one rather than copying it.

Scale it to be legible, not impressive: a few hundred Entries is enough to look
real and small enough that a reviewer can check a total by hand.
