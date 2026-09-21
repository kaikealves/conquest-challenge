import { SaxesParser } from 'saxes';

import { accountCode } from '../domain/accountCode.ts';
import type { Entry } from '../domain/entry.ts';
import { moneyFromDecimal, subtract } from '../domain/money.ts';

/**
 * Translates one Provider's payload into Ledger Entries.
 *
 * This file is the anti-corruption layer of ADR-0002 and the only place Provider
 * vocabulary is allowed to appear. `wsGeneralLedger`, `collectif`,
 * `letteredInBetween`, `voucherRef`, `journalIndex` and the rest terminate here;
 * nothing past this boundary knows the Provider exists. Adding a second Provider
 * means adding a sibling of this file.
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
  controlAccount: 'collectif',
  debit: 'debit',
  credit: 'credit',
  currency: 'currency',
  date: 'date',
  entryId: 'internalID',
  journal: 'ref',
} as const;

type ProviderField = keyof typeof PROVIDER_FIELDS;
type ProviderEntry = Partial<Record<ProviderField, string>>;

const FIELD_BY_PROVIDER_NAME = new Map<string, ProviderField>(
  Object.entries(PROVIDER_FIELDS).map(([field, providerName]) => [
    providerName,
    field as ProviderField,
  ]),
);

/**
 * This Provider files carried-forward balances in a journal whose code is `AN`
 * ("à nouveau"). The sample confirms it: every
 * such Entry is dated the first of January, sits on a balance-sheet Account, and
 * each FiscalYear's set nets to zero. The match is exact so a journal that merely
 * begins with the same letters is not taken for one.
 */
const OPENING_BALANCE_JOURNAL = /^AN$/;

function required(raw: ProviderEntry, field: ProviderField): string {
  const value = raw[field]?.trim();

  if (value === undefined || value === '') {
    throw new Error(`A provider entry is missing <${PROVIDER_FIELDS[field]}>.`);
  }

  return value;
}

/**
 * The Provider sends two columns with the unused one as "0". A debit is positive
 * and a credit negative, so a balanced set of Entries sums to zero.
 *
 * Subtracting rather than picking whichever column is non-zero means a row
 * carrying both is netted instead of having one side silently discarded. No such
 * row exists in the sample, which is exactly why the careless version survives
 * verification against it.
 */
function toEntry(raw: ProviderEntry): Entry {
  const currency = required(raw, 'currency');

  // An Account this Provider ties to a collective one says so in <collectif>,
  // empty on an ordinary Account. Taken from that field and never guessed from
  // the shape of the code, which is only a convention.
  const control = raw.controlAccount?.trim() ?? '';
  const posted = required(raw, 'accountCode');

  return {
    id: required(raw, 'entryId'),
    account: accountCode(posted),
    // An Account naming itself is not an AuxiliaryAccount, and rolling it up
    // would blank its own name.
    ...(control === '' || control === posted ? {} : { controlAccount: accountCode(control) }),
    accountName: raw.accountName?.trim() ?? '',
    amount: subtract(
      moneyFromDecimal(raw.debit ?? '0', currency),
      moneyFromDecimal(raw.credit ?? '0', currency),
    ),
    date: required(raw, 'date'),
    openingBalance: OPENING_BALANCE_JOURNAL.test(raw.journal?.trim() ?? ''),
  };
}

/** Reads a Provider payload and yields Entries as they are parsed. */
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
