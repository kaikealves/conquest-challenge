import { specificityUnder, type AccountCode } from '../domain/accountCode.ts';
import { reportedAccount, reportedAccountName, type Entry } from '../domain/entry.ts';
import { add, moneyToDecimal, subtract, zero, type Currency, type Money } from '../domain/money.ts';
import type {
  CategoryDefinition,
  ReportTemplate,
  ResultDefinition,
  ReportKind,
} from './reportTemplate.ts';
import { standardAccountName } from './standardAccountNames.ts';

/**
 * The payload that crosses to the application. Amounts are exact decimal
 * strings: the application does no arithmetic on them, and JSON has no exact
 * decimal type. The Excel export converts to a number at the cell boundary,
 * since a spreadsheet cell must hold a number rather than text.
 */
/**
 * The accounting entity a Report belongs to. Supplied when the importer runs
 * and carried through unchanged — Reporting does not reinterpret it the way it
 * reinterprets an AuxiliaryAccount or a FiscalYear. See ADR-0009 and ADR-0010.
 */
export type Company = {
  /** A stable slug, used in the URL. Separate from `name` for the same reason a ReportTemplate's is. */
  readonly id: string;
  readonly name: string;
  /** ISO 3166-1 alpha-2. Decides which ReportTemplates apply to this Company. */
  readonly country: string;
};

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
  readonly company: Company;
  readonly kind: ReportKind;
  /**
   * The Accounts no Category claimed, gathered rather than dropped so an
   * incomplete ReportTemplate shows up as a figure. Always present: a template
   * that covers everything has an empty one, and an absent group would be
   * indistinguishable from a Report that never checked.
   */
  readonly unmatched: Category;
  readonly templateId: string;
  readonly templateName: string;
  readonly period: string;
  readonly currency: Currency;
  readonly categories: readonly Category[];
  /**
   * The bottom line: the net of every top-level Category and `unmatched`. For a
   * ProfitAndLoss it is the net result, a profit being a credit; for a
   * BalanceSheet with a Result it is zero, which is what balancing means. Sent
   * rather than left to the client, which does no arithmetic on amounts.
   */
  readonly total: string;
  /**
   * True for a BalanceSheet whose Period holds no OpeningBalance Entries though
   * an earlier Period exists in the ledger: nothing was carried forward, so its
   * figures are that year's movements alone rather than balances. A ledger
   * exported before the previous FiscalYear was closed looks like this. Always
   * false for a ProfitAndLoss, which leaves carried-forward balances out anyway,
   * and for the first Period, which has nothing before it to carry.
   */
  readonly missingOpeningBalances: boolean;
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
  return specificityUnder(account, category.categoryRoots) !== undefined;
}

/** Whether the template answers for this Account; one with no `scope` answers for all. */
function inScope(account: AccountCode, template: ReportTemplate): boolean {
  return template.scope === undefined || specificityUnder(account, template.scope) !== undefined;
}

/**
 * Whether any Entry in the Period was an OpeningBalance. Read from the Accounts'
 * carried-forward totals, which are non-zero wherever one was posted.
 */
function carriesAnythingForward(totals: AccountTotals): boolean {
  return [...totals.values()].some(({ opening }) => opening.minorUnits !== 0n);
}

/** The label of the group holding Accounts no Category claimed. */
const UNMATCHED_LABEL = 'Unmatched';

/** The tree while it is still Money. Decimals are produced once, at the edge. */
type CategoryTotal = {
  readonly label: string;
  readonly total: Money;
  readonly children: readonly CategoryTotal[];
  readonly accounts: readonly AccountTotal[];
};

type Claim = {
  readonly category: CategoryDefinition;
  readonly specificity: number;
  readonly depth: number;
};

/** Whether `challenger` should take an Account from `holder`. */
function outranks(challenger: Claim, holder: Claim): boolean {
  if (challenger.specificity !== holder.specificity) {
    return challenger.specificity > holder.specificity;
  }

  // Equally specific: the nested Category is the more precise place for it. A
  // tie beyond that is never taken from the holder, which is the Category written
  // first, so the outcome is set by the template and not by traversal luck.
  return challenger.depth > holder.depth;
}

/**
 * Decides which one Category each Account belongs to, across the whole template.
 *
 * An Account matched by several Categories — a parent and its child, or two
 * siblings whose CategoryRoots overlap — goes to the one with the longest
 * matching CategoryRoot: `706` is a narrower claim than `70`. Where that ties, the
 * deeper Category wins, and where that ties too, the one written first. So every
 * Account is in at most one Category and no amount is counted twice.
 *
 * Accounts absent from the result matched nothing.
 */
function placeAccounts(
  categories: readonly CategoryDefinition[],
  accounts: readonly AccountTotal[],
): ReadonlyMap<string, CategoryDefinition> {
  const placed = new Map<string, Claim>();

  const visit = (category: CategoryDefinition, depth: number): void => {
    for (const { account } of accounts) {
      const specificity = specificityUnder(account, category.categoryRoots);

      if (specificity === undefined) {
        continue;
      }

      const claim = { category, specificity, depth };
      const holder = placed.get(account.value);

      if (holder === undefined || outranks(claim, holder)) {
        placed.set(account.value, claim);
      }
    }

    category.children?.forEach((child) => {
      visit(child, depth + 1);
    });
  };

  categories.forEach((category) => {
    visit(category, 0);
  });

  return new Map([...placed].map(([code, { category }]) => [code, category]));
}

/**
 * Builds one Category and everything beneath it: its children's totals plus the
 * Accounts placed directly on it.
 */
function aggregateCategory(
  definition: CategoryDefinition,
  placement: ReadonlyMap<string, CategoryDefinition>,
  accounts: readonly AccountTotal[],
  currency: Currency,
): CategoryTotal {
  const children = (definition.children ?? []).map((child) =>
    aggregateCategory(child, placement, accounts, currency),
  );
  const direct = accounts.filter(({ account }) => placement.get(account.value) === definition);

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

/** The Accounts a Category of this label holds, as one Category of no children. */
function flatCategory(
  label: string,
  accounts: readonly AccountTotal[],
  currency: Currency,
): Category {
  const total = accounts.reduce<Money>(
    (running, account) => add(running, account.total),
    zero(currency),
  );

  return toCategory({ label, total, children: [], accounts });
}

/**
 * The Result: the net of the revenue and expense Accounts, taken as they are
 * ledgered (a credit negative), so that it sits among the BalanceSheet's
 * Categories and they net to zero.
 *
 * Listed, not just summed, so a user can see which revenue and expense Accounts
 * make up the figure and the total stays the sum of what is under it.
 */
function resultAccounts(
  definition: ResultDefinition,
  accounts: readonly AccountTotal[],
  placement: ReadonlyMap<string, CategoryDefinition>,
): AccountTotal[] {
  // An Account already placed in a chart Category stays there: it is in exactly
  // one Category even if a template's Result roots overlap its chart roots.
  return accounts.filter(
    ({ account }) => !placement.has(account.value) && matches(account, definition),
  );
}

/**
 * Aggregates Account totals into the Categories a ReportTemplate defines.
 *
 * Which Category an Account lands in is `placeAccounts`' decision. The Result
 * takes its own Accounts by its own CategoryRoots, from those no chart Category
 * has claimed. Anything neither takes is gathered into `unmatched`.
 *
 * `followsEarlierPeriod` says whether the ledger holds a Period before this one,
 * which is what makes an absence of OpeningBalance Entries a gap rather than a
 * beginning.
 */
export function buildReport(
  totals: AccountTotals,
  template: ReportTemplate,
  period: string,
  currency: Currency,
  company: Company,
  followsEarlierPeriod: boolean,
): Report {
  const accounts = [...totals.values()]
    .map((account) => forKind(account, template.kind))
    .map((account) =>
      // The payload's own name wins; the chart's is for an Account the Provider
      // never named, such as a ControlAccount only ever posted to through its
      // AuxiliaryAccounts.
      account.name
        ? account
        : { ...account, name: standardAccountName(account.account, template.country) },
    );
  const placement = placeAccounts(template.categories, accounts);
  const categories = template.categories.map((category) =>
    toCategory(aggregateCategory(category, placement, accounts, currency)),
  );
  const forResult = template.result ? resultAccounts(template.result, accounts, placement) : [];
  const claimedByResult = new Set(forResult.map(({ account }) => account.value));

  // Whatever neither a Category nor the Result took, among the Accounts the
  // template answers for. Together the three cover every Account in scope, so an
  // amount the template is responsible for cannot fall between the ledger and
  // the Report.
  const leftOver = accounts.filter(
    ({ account }) =>
      !placement.has(account.value) &&
      !claimedByResult.has(account.value) &&
      inScope(account, template),
  );

  const reported = accounts.filter(
    ({ account }) =>
      placement.has(account.value) ||
      claimedByResult.has(account.value) ||
      inScope(account, template),
  );
  const total = reported.reduce<Money>(
    (running, account) => add(running, account.total),
    zero(currency),
  );

  return {
    company,
    kind: template.kind,
    templateId: template.id,
    templateName: template.name,
    period,
    currency,
    categories: template.result
      ? [...categories, flatCategory(template.result.label, forResult, currency)]
      : categories,
    unmatched: flatCategory(UNMATCHED_LABEL, leftOver, currency),
    total: moneyToDecimal(total),
    missingOpeningBalances:
      template.kind === 'BalanceSheet' && followsEarlierPeriod && !carriesAnythingForward(totals),
  };
}
