# 08: CategoryRoot matching rules

**What to build:** Accounts land in the right Category regardless of how long their AccountCode is, and ambiguity between overlapping CategoryRoots resolves predictably.

**Blocked by:** 04 (Importer tracer).

**Status:** resolved

- [ ] Matching behaviour lives on the AccountCode value object, not as scattered string comparison
- [ ] An AccountCode shorter than the CategoryRoot is handled without error
- [ ] An AccountCode longer than six characters matches correctly
- [ ] Where several CategoryRoots match, the most specific wins
- [ ] An Account appears in exactly one Category, so no amount is double-counted
- [ ] Fixtures cover a three-character and an eleven-character AccountCode

## Comments

Moved into `tools/importer/` by ADR-0006, along with the rest of the accounting
logic. The rule and its test are unchanged; only the location is. Seam 1 is now
Provider payload in, Report JSON out, from the tool.

## Delivered

- `specificityUnder(code, roots)` on the AccountCode module: the length of the longest root a code is under. Matching is prefix-only, so a code shorter than a root is simply not under it (no error) and a long code is never truncated.
- `placeAccounts` decides, across the whole template, which single Category each Account belongs to: **longest matching CategoryRoot wins; a tie goes to the deeper Category; a further tie goes to the one written first.** Result is independent of the order Categories are written in, except for that last tie, which the template decides.
- Sibling overlap, which ticket 04 knowingly double-counted, is fixed: an Account is now in exactly one Category.
- Fixture `accounts-of-unusual-length` covers 2-, 3-, 6- and 11-character codes.
- The importer's output on the real ledger is byte-identical before and after (the shipped templates have disjoint sibling roots), checked locally.
- A child Category may claim an Account its parent's own roots do not select; the parent's total is then everything beneath it. Accepted and documented on `CategoryDefinition.children`, and tested. Definitions must be distinct objects (parsed JSON always is), because placement is keyed on identity.
- An Account a chart Category has claimed is excluded from the Result, so an overlapping Result root cannot count it twice.
