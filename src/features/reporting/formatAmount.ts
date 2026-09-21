/**
 * Formats an amount for display.
 *
 * The amount arrives as an exact decimal string and is handed to
 * `Intl.NumberFormat` as a string, never through `Number`. That is not
 * pedantry: `Number('90071992547409.93')` is `90071992547409.94`, so a figure
 * computed exactly all the way from the ledger would be shown a cent wrong at
 * the very last step.
 *
 * `currencySign: 'accounting'` renders a credit in parentheses, which is how an
 * accounting report is read. Letting `Intl` do it means the parentheses are the
 * ones the locale uses rather than ASCII ones wrapped on by hand.
 */
const DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Parentheses and colour both fail a screen reader — the first is punctuation it
 * does not announce by default, the second it cannot see. A credit therefore
 * also carries this word, rendered for assistive technology only.
 */
export const CREDIT_LABEL = 'credit';
export const DEBIT_LABEL = 'debit';

/**
 * Whether the amount is a credit — negative, and not merely signed.
 *
 * Testing the leading character would make `-0.00` a credit, so a Category
 * netting to zero would be coloured and announced as income.
 */
export function isCredit(amount: string): boolean {
  return amount.startsWith('-') && /[1-9]/.test(amount);
}

export function formatAmount(amount: string, currency: string, locale: string): string {
  // The whole string is validated, sign included: stripping the sign first would
  // let `--5` through.
  if (!DECIMAL.test(amount)) {
    // Returning the raw text rather than throwing. A malformed amount is a
    // contract violation worth seeing, but throwing here happens inside render
    // and takes the whole page down with it — a blank screen tells a user less
    // than an odd-looking number does.
    return amount;
  }

  // A signed zero is still zero. Left alone, `-0.00` formats as `(€0.00)` and
  // reads as income the Report does not have.
  const normalised = amount.startsWith('-') && !isCredit(amount) ? amount.slice(1) : amount;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencySign: 'accounting',
  }).format(normalised as Intl.StringNumericLiteral);
}
