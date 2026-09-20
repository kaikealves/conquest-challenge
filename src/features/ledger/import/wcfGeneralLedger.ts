import { SaxesParser } from 'saxes';

import { AccountCode } from '../../../shared/accountCode.ts';
import { moneyFromDecimal, negate, type Money } from '../../../shared/money.ts';
import type { Entry, Transaction } from '../entry.ts';

/**
 * Translates one Provider's payload into Ledger Transactions.
 *
 * This file is the anti-corruption layer of ADR-0002 and the only place where
 * Provider vocabulary is allowed to appear. `wsGeneralLedger`, `collectif`,
 * `letteredInBetween`, `voucherRef`, `journalIndex` and the rest terminate here;
 * nothing past this boundary knows the Provider exists. Adding a second Provider
 * means adding a sibling of this file, not touching reporting code.
 *
 * Parsing is incremental. The sample ledger is 5.5 MB of XML and thirty years of
 * accounting data would be far more, so the payload is consumed as it arrives
 * and never held as one document.
 */

/** The Provider's field names. Confined to this module by design. */
const PROVIDER_ENTRY_ELEMENT = 'wsGeneralLedger';
const PROVIDER_FIELDS = {
  accountCode: 'number',
  accountName: 'name',
  debit: 'debit',
  credit: 'credit',
  currency: 'currency',
  date: 'date',
  transaction: 'header',
  entry: 'internalID',
  journal: 'ref',
} as const;

type ProviderEntry = Partial<Record<keyof typeof PROVIDER_FIELDS, string>>;

const FIELD_BY_PROVIDER_NAME = new Map<string, keyof typeof PROVIDER_FIELDS>(
  Object.entries(PROVIDER_FIELDS).map(([field, providerName]) => [
    providerName,
    field as keyof typeof PROVIDER_FIELDS,
  ]),
);

/**
 * A debit is positive and a credit negative, so that a balanced Transaction sums
 * to zero. The Provider sends both columns with the unused one as "0".
 */
function amountOf(raw: ProviderEntry, currency: string): Money {
  const debit = moneyFromDecimal(raw.debit ?? '0', currency);
  const credit = moneyFromDecimal(raw.credit ?? '0', currency);

  return debit.minorUnits === 0n ? negate(credit) : debit;
}

function toEntry(raw: ProviderEntry): Entry {
  const code = raw.accountCode;
  const id = raw.entry;

  if (code === undefined || id === undefined) {
    throw new Error(
      `A provider entry is missing ${code === undefined ? PROVIDER_FIELDS.accountCode : PROVIDER_FIELDS.entry}.`,
    );
  }

  return {
    id,
    account: AccountCode.of(code),
    accountName: raw.accountName ?? '',
    amount: amountOf(raw, raw.currency ?? 'EUR'),
    date: raw.date ?? '',
    journal: raw.journal ?? '',
  };
}

/**
 * Reads a Provider payload and yields Transactions, grouping Entries by the
 * Provider's own transaction identifier.
 *
 * Entries of one Transaction arrive together, so a Transaction is emitted as
 * soon as a different identifier appears rather than after the whole document —
 * that is what keeps memory flat.
 */
export async function* readTransactions(
  payload: AsyncIterable<string>,
): AsyncGenerator<Transaction> {
  const parser = new SaxesParser();

  let raw: ProviderEntry | undefined;
  let field: keyof typeof PROVIDER_FIELDS | undefined;
  let openTransactionId: string | undefined;
  let openEntries: Entry[] = [];
  const ready: Transaction[] = [];

  parser.on('opentag', (tag) => {
    if (tag.name === PROVIDER_ENTRY_ELEMENT) {
      raw = {};
      return;
    }

    if (raw !== undefined) {
      field = FIELD_BY_PROVIDER_NAME.get(tag.name);
    }
  });

  // Text can arrive in several callbacks when a value straddles a chunk
  // boundary, so it is appended rather than assigned.
  parser.on('text', (text) => {
    if (raw !== undefined && field !== undefined) {
      raw[field] = (raw[field] ?? '') + text;
    }
  });

  parser.on('closetag', (tag) => {
    if (tag.name !== PROVIDER_ENTRY_ELEMENT) {
      field = undefined;
      return;
    }

    if (raw === undefined) {
      return;
    }

    const transactionId = raw.transaction ?? raw.entry ?? '';

    if (openTransactionId !== undefined && transactionId !== openTransactionId) {
      ready.push({ id: openTransactionId, entries: openEntries });
      openEntries = [];
    }

    openTransactionId = transactionId;
    openEntries.push(toEntry(raw));
    raw = undefined;
    field = undefined;
  });

  for await (const chunk of payload) {
    parser.write(chunk);

    while (ready.length > 0) {
      yield ready.shift() as Transaction;
    }
  }

  parser.close();

  while (ready.length > 0) {
    yield ready.shift() as Transaction;
  }

  if (openTransactionId !== undefined) {
    yield { id: openTransactionId, entries: openEntries };
  }
}
