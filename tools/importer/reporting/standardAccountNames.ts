import { isUnder, type AccountCode } from '../domain/accountCode.ts';

/**
 * The names a national chart of accounts gives the collective Accounts that
 * customers' and suppliers' own Accounts roll up to.
 *
 * Needed because a Provider may name every AuxiliaryAccount and never the
 * ControlAccount above it — the sample does exactly that for 411100 and 401100 —
 * so after the rollup the Report would show a code with no name. These are the
 * charts' own labels, not invented ones, and are used only when the payload
 * gives no name of its own.
 *
 * Keyed by ISO 3166-1 alpha-2, as a ReportTemplate's `country` is.
 */
const STANDARD_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // Plan comptable général.
  FR: {
    '401': 'Fournisseurs',
    '403': 'Fournisseurs - Effets à payer',
    '404': 'Fournisseurs d’immobilisations',
    '408': 'Fournisseurs - Factures non parvenues',
    '409': 'Fournisseurs débiteurs',
    '411': 'Clients',
    '413': 'Clients - Effets à recevoir',
    '416': 'Clients douteux ou litigieux',
    '418': 'Clients - Produits non encore facturés',
    '419': 'Clients créditeurs',
    '421': 'Personnel - Rémunérations dues',
    '467': 'Autres comptes débiteurs ou créditeurs',
  },
  // The common UK default, as in Sage's standard chart.
  GB: {
    '1100': 'Trade debtors',
    '2100': 'Trade creditors',
  },
};

/**
 * The standard name for an Account under the given country's chart: the one for
 * the longest code it sits under, or `''` when the chart has none. Blank rather
 * than guessed, as `reportedAccountName` is.
 */
export function standardAccountName(account: AccountCode, country: string): string {
  const names = STANDARD_NAMES[country] ?? {};
  const closest = Object.keys(names)
    .filter((code) => isUnder(account, code))
    .sort((left, right) => right.length - left.length)[0];

  return closest === undefined ? '' : (names[closest] ?? '');
}
