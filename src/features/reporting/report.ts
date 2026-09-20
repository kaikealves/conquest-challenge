import type { AccountCode } from '../../shared/accountCode.ts';
import { add, moneyToDecimal, zero, type Currency, type Money } from '../../shared/money.ts';
import type { CategoryDefinition, ReportTemplate } from './reportTemplate.ts';

/**
 * A Report is what crosses the API boundary, so its amounts are exact decimal
 * strings rather than Money: a client must not have to know about minor units,
 * and JSON has no exact decimal type.
 */
export interface ReportCategory {
  readonly label: string;
  readonly total: string;
}

export interface Report {
  readonly template: string;
  readonly currency: Currency;
  readonly categories: readonly ReportCategory[];
}

/**
 * One Account's aggregated position. Reporting never sees an AuxiliaryAccount:
 * those are replaced by their ControlAccount before anything reaches here.
 */
export interface AccountTotal {
  readonly account: AccountCode;
  readonly total: Money;
}

function matches(account: AccountCode, category: CategoryDefinition): boolean {
  return category.roots.some((root) => account.isUnder(root));
}

/**
 * Aggregates Account totals into the Categories a ReportTemplate defines.
 *
 * Accounts matched by no Category are dropped here. That is wrong, and ticket 09
 * fixes it by surfacing them as an explicit unmatched group — an incomplete
 * template must be visible rather than quietly losing money.
 */
export function buildReport(
  accounts: readonly AccountTotal[],
  template: ReportTemplate,
  currency: Currency,
): Report {
  const categories = template.categories.map((category) => {
    const total = accounts
      .filter((account) => matches(account.account, category))
      .reduce<Money>((running, account) => add(running, account.total), zero(currency));

    return { label: category.label, total: moneyToDecimal(total) };
  });

  return { template: template.name, currency, categories };
}
