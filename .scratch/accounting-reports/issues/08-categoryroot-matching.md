# 08: CategoryRoot matching rules

**What to build:** Accounts land in the right Category regardless of how long their AccountCode is, and ambiguity between overlapping CategoryRoots resolves predictably.

**Blocked by:** 04 (Pipeline tracer).

**Status:** ready-for-agent

- [ ] Matching behaviour lives on the AccountCode value object, not as scattered string comparison
- [ ] An AccountCode shorter than the CategoryRoot is handled without error
- [ ] An AccountCode longer than six characters matches correctly
- [ ] Where several CategoryRoots match, the most specific wins
- [ ] An Account appears in exactly one Category, so no amount is double-counted
- [ ] Fixtures cover a three-character and an eleven-character AccountCode
