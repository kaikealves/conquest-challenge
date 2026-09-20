/**
 * The hierarchical identifier of an Account, whose prefix places it in the Chart
 * of Accounts.
 *
 * AccountCodes are variable length — the sample ledger runs from three
 * characters to eleven — so the matching behaviour lives here as functions over
 * the type rather than at call sites. Every silent-dropping bug in this domain
 * starts with a `startsWith`, a `parseInt` or a `padStart` written somewhere
 * else.
 */
export type AccountCode = {
  readonly value: string;
};

export function accountCode(value: string): AccountCode {
  const trimmed = value.trim();

  if (trimmed === '') {
    throw new Error('An AccountCode cannot be empty.');
  }

  return { value: trimmed };
}

/**
 * Whether this Account sits under the given ancestor code. Matching is textual
 * and left-anchored, never numeric: `70` must match `701000` but not `607000`,
 * and a code shorter than the ancestor simply does not match.
 */
export function isUnder(code: AccountCode, ancestorCode: string): boolean {
  return code.value.startsWith(ancestorCode);
}

export function isSameAccount(left: AccountCode, right: AccountCode): boolean {
  return left.value === right.value;
}
