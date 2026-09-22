# 33: A Report ends on its bottom line

**What to build:** A ProfitAndLoss ends on its net result, named a profit or a
loss. A BalanceSheet ends on the check that it balances — the brief's "any
balance report should have assets = liabilities", made visible rather than only
tested. The same line ends the Excel export.

**Blocked by:** 32 (touches the same Report fields and component).

**Status:** resolved

- [x] The importer sends `kind` and `total` on every Report, `total` being the
      net of the top-level Categories and `unmatched`
- [x] The application does no arithmetic: it names the figure it is sent
- [x] A BalanceSheet whose `total` is not zero says it is out of balance, and by
      how much
- [x] A payload without the fields shows no bottom line rather than a guessed one
- [x] The Excel export ends on the same line
- [x] `docs/api-contract.md` documents both fields

## Comments

Raised in the pre-submission review. `docs/api-contract.md` previously said the
payload does not carry a Report's kind because a client had no use for it; a
bottom line is that use, so rule 8 now says otherwise.

Checked on the real ledger: every BalanceSheet's `total` is `0.00`, and each
year's ProfitAndLoss net result equals that year's BalanceSheet Result.
