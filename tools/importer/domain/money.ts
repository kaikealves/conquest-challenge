/**
 * An amount and its currency, held as an exact integer count of minor units.
 *
 * Floating point is prohibited for amounts: 0.1 + 0.2 is not 0.3 in binary
 * floating point, and a Report that is a cent out is a Report nobody trusts.
 * Parsing goes straight from the decimal text to an integer, never through
 * `Number`.
 */

/**
 * How many digits follow the decimal point, per currency. There is no safe
 * default: assuming 2 would silently scale JPY (which has none) by a hundred, so
 * an unknown currency is an error rather than a guess. Adding one is a line.
 */
const MINOR_UNIT_DIGITS: Readonly<Record<string, number>> = { EUR: 2 };

export type Currency = string;

export type Money = {
  readonly minorUnits: bigint;
  readonly currency: Currency;
};

export function minorUnitDigits(currency: Currency): number {
  const digits = MINOR_UNIT_DIGITS[currency];

  if (digits === undefined) {
    throw new Error(
      `Unknown currency ${currency}: add it to MINOR_UNIT_DIGITS with its number of decimal places.`,
    );
  }

  return digits;
}

export function zero(currency: Currency): Money {
  return { minorUnits: 0n, currency };
}

/**
 * Reads provider decimal text such as "-77754.23" or "0" exactly. A longer
 * fraction than the currency has is an error, not a silent round: rounding here
 * would move money without anyone asking.
 */
export function moneyFromDecimal(text: string, currency: Currency): Money {
  const digits = minorUnitDigits(currency);
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text.trim());

  if (!match) {
    throw new Error(`Cannot read "${text}" as a decimal amount.`);
  }

  const [, sign = '', whole = '0', fraction = ''] = match;

  if (fraction.length > digits) {
    throw new Error(
      `Amount "${text}" has ${String(fraction.length)} decimal places but ${currency} has ${String(digits)}.`,
    );
  }

  return {
    minorUnits: BigInt(`${sign}${whole}${fraction.padEnd(digits, '0')}`),
    currency,
  };
}

export function add(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new Error(`Cannot add ${left.currency} to ${right.currency}.`);
  }

  return { minorUnits: left.minorUnits + right.minorUnits, currency: left.currency };
}

export function subtract(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new Error(`Cannot subtract ${right.currency} from ${left.currency}.`);
  }

  return { minorUnits: left.minorUnits - right.minorUnits, currency: left.currency };
}

/**
 * Renders the exact decimal. This is how an amount crosses to the application,
 * which does no arithmetic on it — JSON has no exact decimal type, and a client
 * should not have to know about minor units.
 */
export function moneyToDecimal(money: Money): string {
  const digits = minorUnitDigits(money.currency);
  const negative = money.minorUnits < 0n;
  const absolute = (negative ? -money.minorUnits : money.minorUnits).toString();

  if (digits === 0) {
    return `${negative ? '-' : ''}${absolute}`;
  }

  const padded = absolute.padStart(digits + 1, '0');

  return `${negative ? '-' : ''}${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}
