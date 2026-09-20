# 24: Stretch — Kotlin backend

**What to build:** Only if everything above is complete. A minimal Kotlin service implementing the contract from ticket 10, so the frontend swaps to it by changing a base URL.

Per ADR-0003 the backend is a design deliverable, not a build commitment. Its value here is as evidence of trajectory rather than of polish. No JDK, Kotlin or Gradle is installed locally, so this begins with toolchain setup.

**Blocked by:** 20 (Dossier — architectural blueprint and performance).

**Status:** ready-for-human

- [ ] Toolchain installed and a service starts locally
- [ ] The Report endpoint from ticket 10 is implemented against the same contract
- [ ] The domain model mirrors the one in the dossier: Transaction as aggregate root, value objects for AccountCode and Money
- [ ] The frontend runs against it by changing a base URL and nothing else
- [ ] Left un-merged rather than half-merged if it cannot be finished
