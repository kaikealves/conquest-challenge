/**
 * The hierarchical identifier of an Account, whose prefix places it in the Chart
 * of Accounts.
 *
 * AccountCodes are variable length — the sample ledger runs from three
 * characters to eleven — so the matching behaviour lives here rather than at
 * call sites. Every silent-dropping bug in this domain starts with a
 * `startsWith`, a `parseInt` or a `padStart` written somewhere else.
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
 * and left-anchored, never numeric: `70` matches `701000` but not `607000`, and
 * a code shorter than the ancestor does not match.
 */
export function isUnder(code: AccountCode, ancestorCode: string): boolean {
  return code.value.startsWith(ancestorCode);
}

/**
 * How specifically an Account sits under the closest of these ancestor codes:
 * the length of the longest one it is under, or `undefined` if it is under none.
 * A longer ancestor is a narrower claim, so this is what "most specific wins"
 * compares. It lives beside `isUnder` for the same reason: matching is a
 * question about a code, and asking it in one place keeps it from drifting.
 */
export function specificityUnder(
  code: AccountCode,
  ancestorCodes: readonly string[],
): number | undefined {
  const lengths = ancestorCodes
    .filter((ancestorCode) => isUnder(code, ancestorCode))
    .map((ancestorCode) => ancestorCode.length);

  return lengths.length === 0 ? undefined : Math.max(...lengths);
}
