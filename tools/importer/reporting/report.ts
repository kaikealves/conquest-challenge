import { isUnder, type AccountCode } from '../domain/accountCode.ts';
import { reportedAccount, reportedAccountName, type Entry } from '../domain/entry.ts';
import { add, moneyToDecimal, subtract, zero, type Currency, type Money } from '../domain/money.ts';
import type {
  CategoryDefinition,
  ReportTemplate,
  ResultDefinition,
  ReportKind,
} from './reportTemplate.ts';

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

/**
 * `total` is everything posted to the Account in the Period; `opening` is the
 * part of it that was carried forward. Keeping both lets one pass over the
 * payload serve both kinds of Report.
 */
type AccountTotal = { account: AccountCode; name: string; total: Money; opening: Money };

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
    const account = reportedAccount(entry);
    const before = totals.get(account.value);

    totals.set(account.value, {
      account,
      // Keep the first name seen: a blank one (a rolled-up Account) must not
      // overwrite a real one from an Entry posted directly.
      name: before?.name || reportedAccountName(entry),
      total: add(before?.total ?? zero(currency), entry.amount),
      opening: entry.openingBalance
        ? add(before?.opening ?? zero(currency), entry.amount)
        : (before?.opening ?? zero(currency)),
    });
    periods.set(period, totals);
  }

  return periods;
}

function matches(account: AccountCode, category: CategoryDefinition | ResultDefinition): boolean {
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
 * What an Account contributes to a Report of this kind. A ProfitAndLoss leaves
 * out what was carried forward; a BalanceSheet takes everything.
 */
function forKind(account: AccountTotal, kind: ReportKind): AccountTotal {
  return kind === 'ProfitAndLoss'
    ? { ...account, total: subtract(account.total, account.opening) }
    : account;
}

/**
 * The Result: the net of the revenue and expense Accounts, taken as they are
 * ledgered (a credit negative), so that it sits among the BalanceSheet's
 * Categories and they net to zero.
 */
function resultCategory(
  definition: ResultDefinition,
  accounts: readonly AccountTotal[],
  currency: Currency,
): Category {
  // Listed, not just summed, so a user can see which revenue and expense
  // Accounts make up the figure and the total stays the sum of what is under it.
  const matched = accounts.filter(({ account }) => matches(account, definition));
  const total = matched.reduce<Money>(
    (running, account) => add(running, account.total),
    zero(currency),
  );

  return toCategory({ label: definition.label, total, children: [], accounts: matched });
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
  const accounts = [...totals.values()].map((account) => forKind(account, template.kind));
  const categories = template.categories.map((category) =>
    toCategory(aggregateCategory(category, accounts, currency)),
  );

  return {
    templateId: template.id,
    templateName: template.name,
    period,
    currency,
    categories: template.result
      ? [...categories, resultCategory(template.result, accounts, currency)]
      : categories,
  };
}
