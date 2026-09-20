import { SaxesParser } from 'saxes';

import { accountCode } from '../../../shared/accountCode.ts';
import { moneyFromDecimal, subtract } from '../../../shared/money.ts';
import type { Entry } from '../entry.ts';

/**
 * Translates one Provider's payload into Ledger Entries.
 *
 * This file is the anti-corruption layer of ADR-0002 and the only place where
 * Provider vocabulary is allowed to appear. `wsGeneralLedger`, `collectif`,
 * `letteredInBetween`, `voucherRef`, `journalIndex` and the rest terminate here;
 * nothing past this boundary knows the Provider exists. Adding a second Provider
 * means adding a sibling of this file, not touching reporting code.
 *
 * Parsing is incremental. The sample ledger is 5.5 MB and thirty years of
 * accounting data would be far more, so the payload is consumed as it arrives
 * and never held as one document.
 */

/** The Provider's own field names. Confined to this module by design. */
const PROVIDER_ENTRY_ELEMENT = 'wsGeneralLedger';
const PROVIDER_FIELDS = {
  accountCode: 'number',
  accountName: 'name',
  debit: 'debit',
  credit: 'credit',
  currency: 'currency',
  date: 'date',
  entryId: 'internalID',
} as const;

type ProviderField = keyof typeof PROVIDER_FIELDS;
type ProviderEntry = Partial<Record<ProviderField, string>>;

const FIELD_BY_PROVIDER_NAME = new Map<string, ProviderField>(
  Object.entries(PROVIDER_FIELDS).map(([field, providerName]) => [
    providerName,
    field as ProviderField,
  ]),
);

function required(raw: ProviderEntry, field: ProviderField): string {
  const value = raw[field];

  if (value === undefined || value.trim() === '') {
    throw new Error(`A provider entry is missing <${PROVIDER_FIELDS[field]}>.`);
  }

  return value.trim();
}

/**
 * The Provider sends two columns with the unused one as "0". A debit is positive
 * and a credit negative, so a balanced set of Entries sums to zero.
 *
 * Subtracting rather than picking whichever column is non-zero means a row
 * carrying both is netted instead of having one side silently discarded. No such
 * row exists in the sample, which is exactly why the careless version would have
 * survived.
 */
function amountOf(raw: ProviderEntry): ReturnType<typeof moneyFromDecimal> {
  const currency = required(raw, 'currency');

  return subtract(
    moneyFromDecimal(raw.debit ?? '0', currency),
    moneyFromDecimal(raw.credit ?? '0', currency),
  );
}

function toEntry(raw: ProviderEntry): Entry {
  return {
    id: required(raw, 'entryId'),
    account: accountCode(required(raw, 'accountCode')),
    accountName: raw.accountName?.trim() ?? '',
    amount: amountOf(raw),
    date: required(raw, 'date'),
  };
}

/**
 * Reads a Provider payload and yields Entries as they are parsed.
 *
 * Entries are yielded individually rather than grouped: this Provider sorts its
 * payload by Account, so the Entries of one accounting Transaction are scattered
 * across the whole document and cannot be grouped by a single forward pass. See
 * ticket 05.
 */
export async function* readEntries(payload: AsyncIterable<string>): AsyncGenerator<Entry> {
  const parser = new SaxesParser();
  const parsed: ProviderEntry[] = [];

  let raw: ProviderEntry | undefined;
  let field: ProviderField | undefined;

  parser.on('opentag', (tag) => {
    if (tag.name === PROVIDER_ENTRY_ELEMENT) {
      raw = {};
    } else if (raw !== undefined) {
      field = FIELD_BY_PROVIDER_NAME.get(tag.name);
    }
  });

  // Text arrives in several callbacks when a value straddles a chunk boundary,
  // so it is appended rather than assigned.
  parser.on('text', (text) => {
    if (raw !== undefined && field !== undefined) {
      raw[field] = (raw[field] ?? '') + text;
    }
  });

  parser.on('closetag', (tag) => {
    if (tag.name === PROVIDER_ENTRY_ELEMENT && raw !== undefined) {
      parsed.push(raw);
      raw = undefined;
    }

    field = undefined;
  });

  for await (const chunk of payload) {
    parser.write(chunk);

    yield* parsed.splice(0).map(toEntry);
  }

  parser.close();

  yield* parsed.splice(0).map(toEntry);
}
