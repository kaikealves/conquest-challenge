import { isUnder, type AccountCode } from '../domain/accountCode.ts';
import type { Entry } from '../domain/entry.ts';
import { add, moneyToDecimal, zero, type Currency, type Money } from '../domain/money.ts';
import type { CategoryDefinition, ReportTemplate } from './reportTemplate.ts';

/**
 * The payload that crosses to the application. Amounts are exact decimal
 * strings: the application does no arithmetic on them, and JSON has no exact
 * decimal type. The Excel export converts to a number at the cell boundary,
 * since a spreadsheet cell must hold a number rather than text.
 */
export type Account = {
  /** The AccountCode. Variable length; never padded or parsed as a number. */
  readonly code: string;
  readonly name: string;
  readonly total: string;
};

export type Category = {
  readonly label: string;
  readonly total: string;
  readonly children: readonly Category[];
  /**
   * The Accounts this Category holds directly — matched by it and by no child,
   * so an Account appears exactly once in the tree.
   */
  readonly accounts: readonly Account[];
};

export type Report = {
  readonly templateId: string;
  readonly templateName: string;
  readonly period: string;
  readonly currency: Currency;
  readonly categories: readonly Category[];
};

type AccountTotal = { account: AccountCode; name: string; total: Money };

export type AccountTotals = ReadonlyMap<string, AccountTotal>;

/**
 * The Period an Entry falls in.
 *
 * A FiscalYear is taken to be a calendar year. That holds for the sample and is
 * the common French case, but a FiscalYear can start in any month; ticket 15
 * owns making the boundary configurable rather than assumed.
 */
export function periodOf(entry: Entry): string {
  return entry.date.slice(0, 4);
}

/**
 * Folds Entries into per-Account totals, one set per Period, as they arrive.
 *
 * The source is consumed lazily, so memory stays proportional to the Chart of
 * Accounts times the number of Periods, never to the number of Entries. The
 * sample is 6774 Entries across 118 Accounts and five FiscalYears.
 */
export async function totalByAccountAndPeriod(
  entries: AsyncIterable<Entry>,
  currency: Currency,
): Promise<ReadonlyMap<string, AccountTotals>> {
  const periods = new Map<string, Map<string, AccountTotal>>();

  for await (const entry of entries) {
    const period = periodOf(entry);
    const totals = periods.get(period) ?? new Map<string, AccountTotal>();
    const running = totals.get(entry.account.value)?.total ?? zero(currency);

    totals.set(entry.account.value, {
      account: entry.account,
      name: entry.accountName,
      total: add(running, entry.amount),
    });
    periods.set(period, totals);
  }

  return periods;
}

function matches(account: AccountCode, category: CategoryDefinition): boolean {
  return category.categoryRoots.some((categoryRoot) => isUnder(account, categoryRoot));
}

/** The tree while it is still Money. Decimals are produced once, at the edge. */
type CategoryTotal = {
  readonly label: string;
  readonly total: Money;
  readonly children: readonly CategoryTotal[];
  readonly accounts: readonly AccountTotal[];
};

function accountCodesIn(category: CategoryTotal): string[] {
  return [
    ...category.accounts.map(({ account }) => account.value),
    ...category.children.flatMap(accountCodesIn),
  ];
}

/**
 * Builds one Category and everything beneath it.
 *
 * An Account is placed at the deepest Category matching it, so it is counted and
 * listed exactly once; a parent's total is its children's totals plus whatever
 * it holds directly.
 */
function aggregateCategory(
  definition: CategoryDefinition,
  candidates: readonly AccountTotal[],
  currency: Currency,
): CategoryTotal {
  const mine = candidates.filter((account) => matches(account.account, definition));
  const definedChildren = definition.children ?? [];
  const children = definedChildren.map((child) => aggregateCategory(child, mine, currency));

  // Taken from the subtrees just built rather than by matching against each
  // child again: that repeats work the recursion has done, and it would disagree
  // with the tree if a child ever placed an Account somewhere unexpected.
  const claimedByAChild = new Set(children.flatMap(accountCodesIn));
  const direct = mine.filter(({ account }) => !claimedByAChild.has(account.value));

  const total = [...children, ...direct].reduce<Money>(
    (running, part) => add(running, part.total),
    zero(currency),
  );

  return { label: definition.label, total, children, accounts: direct };
}

function toCategory(aggregated: CategoryTotal): Category {
  return {
    label: aggregated.label,
    total: moneyToDecimal(aggregated.total),
    children: aggregated.children.map(toCategory),
    accounts: aggregated.accounts.map((account) => ({
      code: account.account.value,
      name: account.name,
      total: moneyToDecimal(account.total),
    })),
  };
}

/**
 * Aggregates Account totals into the Categories a ReportTemplate defines.
 *
 * Two deliberate gaps, both owned by later tickets and visible here rather than
 * buried:
 *
 * - An Account matched by two *sibling* Categories is counted in both. The spec
 *   says an Account matches at most one Category, the most specific winning;
 *   ticket 08 owns that. Today's templates use disjoint sibling CategoryRoots.
 *   Parent and child overlapping is not this problem: that is resolved here, by
 *   placing an Account at the deepest Category matching it.
 * - An Account matched by no Category is dropped. Ticket 09 surfaces those, so
 *   an incomplete template is visible rather than quietly losing money.
 */
export function buildReport(
  totals: AccountTotals,
  template: ReportTemplate,
  period: string,
  currency: Currency,
): Report {
  const accounts = [...totals.values()];

  return {
    templateId: template.id,
    templateName: template.name,
    period,
    currency,
    categories: template.categories.map((category) =>
      toCategory(aggregateCategory(category, accounts, currency)),
    ),
  };
}
