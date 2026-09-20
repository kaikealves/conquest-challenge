import type { AccountCode } from '../../shared/accountCode.ts';
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

function matches(account: AccountCode, category: CategoryDefinition): boolean {
  return category.categoryRoots.some((categoryRoot) => account.isUnder(categoryRoot));
}

/**
 * Aggregates Entries into Categories — the work this context exists to do.
 *
 * Accounts are accumulated as their Entries arrive rather than collected first,
 * so memory stays proportional to the Chart of Accounts rather than to the
 * number of Entries. The sample ledger is 6774 Entries across 118 Accounts.
 */
export class ReportAggregator {
  readonly #totals = new Map<string, { account: AccountCode; total: Money }>();
  readonly #currency: Currency;

  constructor(currency: Currency) {
    this.#currency = currency;
  }

  addEntry(account: AccountCode, amount: Money): void {
    const existing = this.#totals.get(account.value);

    this.#totals.set(account.value, {
      account,
      total: add(existing?.total ?? zero(this.#currency), amount),
    });
  }

  /**
   * Two deliberate gaps, both owned by later tickets and both visible here
   * rather than buried:
   *
   * - An Account matched by two Categories is counted in both. The spec says an
   *   Account matches at most one Category, the most specific winning; ticket 08
   *   owns that. Today's templates use disjoint CategoryRoots, so nothing
   *   double-counts yet.
   * - An Account matched by no Category is dropped. Ticket 09 surfaces those as
   *   an explicit unmatched group, because an incomplete template must be
   *   visible rather than quietly losing money.
   */
  toReport(template: ReportTemplate): Report {
    const accounts = [...this.#totals.values()];

    const categories = template.categories.map((category) => {
      const total = accounts
        .filter(({ account }) => matches(account, category))
        .reduce<Money>(
          (running, { total: accountTotal }) => add(running, accountTotal),
          zero(this.#currency),
        );

      return { label: category.label, total: moneyToDecimal(total) };
    });

    return { template: template.name, currency: this.#currency, categories };
  }
}
