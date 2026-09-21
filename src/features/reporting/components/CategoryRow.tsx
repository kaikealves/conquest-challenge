import type { Category } from '../api/contract.ts';
import { DISPLAY_LOCALE } from '../displayLocale.ts';
import { CREDIT_LABEL, DEBIT_LABEL, formatAmount, isCredit } from '../formatAmount.ts';

type CategoryRowProps = {
  readonly category: Category;
  readonly currency: string;
};

/**
 * One labelled line of a Report.
 *
 * A credit is signalled three ways, because the first two reach different
 * people and neither reaches everyone: parentheses for a sighted reader who
 * knows accounting, colour for a quick scan, and a visually hidden word for
 * assistive technology, which announces neither of the others.
 */
export function CategoryRow({ category, currency }: CategoryRowProps) {
  const credit = isCredit(category.total);

  return (
    <tr className="border-b border-slate-200 last:border-0">
      <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-900">
        {category.label}
      </th>
      <td
        className={`py-2 text-right font-mono tabular-nums ${
          credit ? 'text-emerald-700' : 'text-slate-900'
        }`}
      >
        {formatAmount(category.total, currency, DISPLAY_LOCALE)}
        <span className="sr-only"> {credit ? CREDIT_LABEL : DEBIT_LABEL}</span>
      </td>
    </tr>
  );
}
