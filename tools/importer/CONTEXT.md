# Ledger

Receives accounting data from external providers and holds it as Entries posted
to Accounts. This context owns the integrity of the accounting record; it does no
aggregation. It lives entirely in `tools/importer/` and never runs in a browser.

## Language

**Entry**:
A single line of accounting data: one Money amount posted to one Account on one
date.
_Avoid_: line, record, posting, transaction

**Transaction**:
A set of Entries that balance to zero. The unit of accounting integrity.
_Avoid_: voucher, batch, journal entry

_Not modelled in code._ This Provider sorts its payload by Account, so one
Transaction's Entries are scattered across the document and cannot be grouped in
a single forward pass. Validating the zero-sum invariant therefore needs a design
of its own, which the dossier argues rather than the code implementing; its only
observable output is a count.

**Journal**:
The book a Transaction belongs to, naming where it originated — sales, bank,
purchases, opening balances.
_Avoid_: ref, book, daybook

**Account**:
A bucket in the Chart of Accounts that an Entry is posted to.
_Avoid_: GL account, ledger account, bucket

**AccountCode**:
The hierarchical identifier of an Account, whose prefix places it in the Chart of
Accounts. Variable length.
_Avoid_: number, account number, code

**AuxiliaryAccount**:
A sub-ledger Account for one named customer or supplier, which rolls up into a
ControlAccount.
_Avoid_: sub-account, third-party account, analytic account

**ControlAccount**:
The Chart of Accounts Account that aggregates a set of AuxiliaryAccounts.
_Avoid_: collectif, collective account, parent account

**OpeningBalance**:
An Entry carrying a balance-sheet Account forward into a new FiscalYear. Never
posted to a revenue or expense Account.
_Avoid_: à nouveau, AN, carry-forward, brought-forward

**FiscalYear**:
The accounting period after which revenue and expense Accounts reset to zero and
balance-sheet Accounts carry forward.
_Avoid_: financial year, year, accounting period

**Provider**:
An external accounting system that supplies accounting data.
_Avoid_: source, vendor, integration, client

**Money**:
An amount and its currency, held as a decimal. Never a floating-point number.
_Avoid_: amount, value, sum, balance
