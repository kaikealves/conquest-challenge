# 35: Name the ControlAccounts the Provider never names

**What to build:** A ControlAccount that is only ever posted to through its
AuxiliaryAccounts appears in a Report with a name, not just a code.

**Blocked by:** 06 (Auxiliary rollup).

**Status:** resolved

- [x] An Account with no name in the payload takes the standard name its
      national chart gives it (PCG for FR, the common UK default for GB),
      matched on the longest code it sits under
- [x] A name the payload does give always wins
- [x] Under a chart with no standard name for the code, the name stays blank
      rather than guessed

## Comments

Raised by the user: 411100 showed with no name. The sample names every customer
and supplier but never 411100 or 401100 themselves, and neither is
posted to directly, so after the rollup the payload holds no name for them.
