import { DISPLAY_LOCALE } from '../displayLocale.ts';
import { CREDIT_LABEL, DEBIT_LABEL, formatAmount, isCredit } from '../formatAmount.ts';

type AmountCellProps = {
  readonly amount: string;
  readonly currency: string;
};

/**
 * An amount, set apart as a credit or a debit.
 *
 * A credit is signalled three ways, because the first two reach different
 * people and neither reaches everyone: parentheses for a sighted reader who
 * knows accounting, colour for a quick scan, and a visually hidden word for
 * assistive technology, which announces neither of the others.
 */
export function AmountCell({ amount, currency }: AmountCellProps) {
  const credit = isCredit(amount);

  return (
    <td
      className={`py-2 text-right font-mono tabular-nums ${
        credit ? 'text-emerald-700' : 'text-slate-900'
      }`}
    >
      {formatAmount(amount, currency, DISPLAY_LOCALE)}
      <span className="sr-only"> {credit ? CREDIT_LABEL : DEBIT_LABEL}</span>
    </td>
  );
}
