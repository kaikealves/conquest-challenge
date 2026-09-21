import type { Category } from '../api/contract.ts';
import { formatAmount, isCredit } from '../formatAmount.ts';

type CategoryRowProps = {
  readonly category: Category;
  readonly currency: string;
};

/**
 * One labelled line of a Report.
 *
 * A credit is set apart twice over — parentheses and colour — because colour
 * alone excludes anyone who cannot distinguish it, and the parentheses survive
 * a printout and a screen reader.
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
        {formatAmount(category.total, currency)}
      </td>
    </tr>
  );
}
