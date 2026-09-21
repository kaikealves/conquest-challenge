import type { Account } from '../api/contract.ts';
import { AmountCell } from './AmountCell.tsx';
import { indentation } from './indentation.ts';

type AccountRowProps = {
  readonly account: Account;
  readonly currency: string;
  readonly depth: number;
};

/** An Account inside a Category: the leaf a user reaches when investigating a figure. */
export function AccountRow({ account, currency, depth }: AccountRowProps) {
  return (
    <tr className="border-b border-slate-200 bg-slate-50 last:border-0">
      <th
        scope="row"
        className="py-2 pr-4 text-left font-normal text-slate-700"
        style={indentation(depth)}
      >
        {/* A code is an identifier, not a number: monospace keeps its digits
            aligned and nothing here parses it. */}
        <span className="mr-2 font-mono text-slate-600">{account.code}</span>
        {account.name}
      </th>
      <AmountCell amount={account.total} currency={currency} />
    </tr>
  );
}
