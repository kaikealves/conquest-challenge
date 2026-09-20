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
export type Category = {
  readonly label: string;
  readonly total: string;
};

export type Report = {
  readonly templateId: string;
  readonly templateName: string;
  readonly period: string;
  readonly currency: Currency;
  readonly categories: readonly Category[];
};

type AccountTotal = { account: AccountCode; total: Money };

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

    totals.set(entry.account.value, { account: entry.account, total: add(running, entry.amount) });
    periods.set(period, totals);
  }

  return periods;
}

function matches(account: AccountCode, category: CategoryDefinition): boolean {
  return category.categoryRoots.some((categoryRoot) => isUnder(account, categoryRoot));
}

/**
 * Aggregates Account totals into the Categories a ReportTemplate defines.
 *
 * Two deliberate gaps, both owned by later tickets and visible here rather than
 * buried:
 *
 * - An Account matched by two Categories is counted in both. The spec says an
 *   Account matches at most one Category, the most specific winning; ticket 08
 *   owns that. Today's templates use disjoint CategoryRoots.
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

  const categories = template.categories.map((category) => {
    const total = accounts
      .filter(({ account }) => matches(account, category))
      .reduce<Money>((running, entry) => add(running, entry.total), zero(currency));

    return { label: category.label, total: moneyToDecimal(total) };
  });

  return {
    templateId: template.id,
    templateName: template.name,
    period,
    currency,
    categories,
  };
}
