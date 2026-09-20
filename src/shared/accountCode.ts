/**
 * The hierarchical identifier of an Account, whose prefix places it in the Chart
 * of Accounts.
 *
 * AccountCodes are variable length — the sample ledger runs from three
 * characters to eleven — so this type carries the matching behaviour rather than
 * letting callers reach for string operations. Every silent-dropping bug in this
 * domain comes from somewhere assuming a fixed width, comparing numerically, or
 * padding before comparing.
 */
export class AccountCode {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  static of(value: string): AccountCode {
    const trimmed = value.trim();

    if (trimmed === '') {
      throw new Error('An AccountCode cannot be empty.');
    }

    return new AccountCode(trimmed);
  }

  get value(): string {
    return this.#value;
  }

  /**
   * Whether this Account sits under the given ancestor code. Matching is
   * textual and left-anchored, never numeric: `70` must match `701000` but not
   * `607000`, and a code shorter than the ancestor simply does not match.
   *
   * Callers pass an ancestor code rather than doing this themselves, because
   * every silent-dropping bug in this domain starts with a `startsWith`, a
   * `parseInt` or a `padStart` written at a call site.
   */
  isUnder(ancestorCode: string): boolean {
    return this.#value.startsWith(ancestorCode);
  }

  equals(other: AccountCode): boolean {
    return this.#value === other.#value;
  }

  toString(): string {
    return this.#value;
  }
}
