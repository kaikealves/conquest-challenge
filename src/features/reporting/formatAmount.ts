/**
 * Formats an amount for display.
 *
 * The amount arrives as an exact decimal string and is handed to
 * `Intl.NumberFormat` as a string, never through `Number`. That is not
 * pedantry: `Number('90071992547409.93')` is `90071992547409.94`, so a figure
 * past 2^53 minor units would be shown a cent wrong after being computed
 * correctly all the way here.
 *
 * A credit — a negative amount in this domain — is shown in parentheses rather
 * than with a minus sign, which is how an accounting report is read. The sign is
 * a presentation concern; the value itself is untouched.
 */
const DECIMAL = /^-?\d+(\.\d+)?$/;

function asNumericLiteral(amount: string): Intl.StringNumericLiteral {
  if (!DECIMAL.test(amount)) {
    throw new Error(`"${amount}" is not an amount this Report can display.`);
  }

  // Checked above, so the narrowing is a statement about validated input rather
  // than a hope. `Intl` needs the literal type; the contract guarantees the
  // shape.
  return amount as Intl.StringNumericLiteral;
}

export function isCredit(amount: string): boolean {
  return amount.startsWith('-');
}

export function formatAmount(amount: string, currency: string, locale?: string): string {
  const magnitude = asNumericLiteral(isCredit(amount) ? amount.slice(1) : amount);

  const formatted = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    magnitude,
  );

  return isCredit(amount) ? `(${formatted})` : formatted;
}
