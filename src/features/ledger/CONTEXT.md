# Ledger

Receives accounting data from external providers and holds it as balanced
double-entry Transactions. This context owns the integrity of the accounting
record; it does no aggregation.

## Language

**Entry**:
A single line of accounting data: one Money amount posted to one Account on one
date.
_Avoid_: line, record, posting, transaction

**Transaction**:
A set of Entries that balance to zero. The unit of accounting integrity, and the
only way Entries may be created.
_Avoid_: voucher, batch, journal entry

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
