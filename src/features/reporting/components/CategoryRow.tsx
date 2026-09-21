import { memo, useState } from 'react';

import type { Category } from '../api/contract.ts';
import { AccountRow } from './AccountRow.tsx';
import { AmountCell } from './AmountCell.tsx';
import { indentation } from './indentation.ts';

type CategoryRowProps = {
  readonly category: Category;
  readonly currency: string;
  /** 0 for a Category at the top of the Report. */
  readonly depth?: number;
};

/**
 * One labelled line of a Report, and — when expanded — everything beneath it.
 *
 * It renders its own children by rendering itself, so nesting is bounded by the
 * data rather than by the code. Whether a Category is open is that row's own
 * concern: nothing else needs to know, so no state is lifted. The cost is that
 * collapsing a parent forgets which of its children were open, which reads as
 * the tidy behaviour a user expects.
 *
 * The arrow is a CSS pseudo-element driven by `aria-expanded`, so it is not part of
 * the label's text. Some screen readers do read generated content; the
 * `aria-expanded` state is the signal that is meant to be relied on.
 *
 * Rows are omitted, not hidden, while collapsed, so a screen reader is not read
 * a hundred Accounts nobody asked for.
 */
export const CategoryRow = memo(function CategoryRow({
  category,
  currency,
  depth = 0,
}: CategoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const expandable = category.children.length > 0 || category.accounts.length > 0;

  return (
    <>
      <tr className="border-b border-slate-200 last:border-0">
        <th
          scope="row"
          className="py-2 pr-4 text-left font-medium text-slate-900"
          style={indentation(depth)}
        >
          {expandable ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                setExpanded((open) => !open);
              }}
              className="flex items-center gap-2 rounded before:w-3 before:text-slate-500 before:content-['▸'] aria-expanded:before:content-['▾'] text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              {category.label}
            </button>
          ) : (
            // Same left edge as a sibling's button, so labels line up.
            <span className="pl-5">{category.label}</span>
          )}
        </th>
        <AmountCell amount={category.total} currency={currency} />
      </tr>

      {expanded && (
        <>
          {category.children.map((child, position) => (
            // The contract does not promise a Category label is unique, so the
            // key carries its position as well.
            <CategoryRow
              key={`${String(position)}-${child.label}`}
              category={child}
              currency={currency}
              depth={depth + 1}
            />
          ))}
          {category.accounts.map((account) => (
            // An Account appears once in a Report, so its code is a safe key.
            <AccountRow
              key={account.code}
              account={account}
              currency={currency}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </>
  );
});
