import { isUnder, type AccountCode } from '../../shared/accountCode.ts';
import { add, moneyToDecimal, zero, type Currency, type Money } from '../../shared/money.ts';
import type { CategoryDefinition, ReportTemplate } from './reportTemplate.ts';

/**
 * One labelled line of a Report, holding every Account matched by its
 * CategoryRoots.
 *
 * Amounts cross the API boundary as exact decimal strings rather than Money: a
 * client should not have to know about minor units, and JSON has no exact
 * decimal type. The Excel export converts to a real number at that edge, since
 * a spreadsheet cell must hold a number rather than text.
 */
export type Category = {
  readonly label: string;
  readonly total: string;
};

export type Report = {
  readonly template: string;
  readonly currency: Currency;
  readonly categories: readonly Category[];
};

/** One Account's aggregated position, keyed by AccountCode. */
export type AccountTotals = ReadonlyMap<string, { account: AccountCode; total: Money }>;

/** A thing that can be aggregated: everything this context needs of an Entry. */
type Postable = {
  readonly account: AccountCode;
  readonly amount: Money;
};

/**
 * Folds Entries into per-Account totals as they arrive — the aggregation this
 * context exists to do.
 *
 * The source is consumed lazily, so memory stays proportional to the Chart of
 * Accounts rather than to the number of Entries. The sample ledger is 6774
 * Entries across 118 Accounts.
 */
export async function totalByAccount(
  entries: AsyncIterable<Postable>,
  currency: Currency,
): Promise<AccountTotals> {
  const totals = new Map<string, { account: AccountCode; total: Money }>();

  for await (const { account, amount } of entries) {
    const running = totals.get(account.value)?.total ?? zero(currency);

    totals.set(account.value, { account, total: add(running, amount) });
  }

  return totals;
}

function matches(account: AccountCode, category: CategoryDefinition): boolean {
  return category.categoryRoots.some((categoryRoot) => isUnder(account, categoryRoot));
}

/**
 * Aggregates Account totals into the Categories a ReportTemplate defines.
 *
 * Two deliberate gaps, both owned by later tickets and both visible here rather
 * than buried:
 *
 * - An Account matched by two Categories is counted in both. The spec says an
 *   Account matches at most one Category, the most specific winning; ticket 08
 *   owns that. Today's templates use disjoint CategoryRoots, so nothing
 *   double-counts yet.
 * - An Account matched by no Category is dropped. Ticket 09 surfaces those as an
 *   explicit unmatched group, because an incomplete template must be visible
 *   rather than quietly losing money.
 */
export function buildReport(
  totals: AccountTotals,
  template: ReportTemplate,
  currency: Currency,
): Report {
  const accounts = [...totals.values()];

  const categories = template.categories.map((category) => {
    const total = accounts
      .filter(({ account }) => matches(account, category))
      .reduce<Money>(
        (running, { total: accountTotal }) => add(running, accountTotal),
        zero(currency),
      );

    return { label: category.label, total: moneyToDecimal(total) };
  });

  return { template: template.name, currency, categories };
}
