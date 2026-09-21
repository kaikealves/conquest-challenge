# 18: Memoization pass

**What to build:** A deliberate optimisation pass over the Report view, with the reasoning recorded. The brief asks for the strategy to be explained, so the justification matters as much as the change.

**Blocked by:** 13 (Hierarchical Report).

**Status:** resolved

- [ ] The Category tree aggregation is memoized, because it is real CPU work
- [ ] Report rows are memoized so expanding one row does not re-render the tree
- [ ] Memoization is not applied by reflex elsewhere; the restraint is deliberate and stated
- [ ] The reasoning is written down, including why request deduplication is the first-order win and render memoization second
- [ ] A measurement or profile supports the claim rather than asserting it

## Delivered, with one bullet not applying as written

The Category tree aggregation is _not_ memoized because the client does not aggregate (ADR-0006 moved that to the importer); there is nothing costly to cache. What the measurement found to be real CPU work was constructing an `Intl.NumberFormat` per row, so that is what is cached. `CategoryRow` is `React.memo`'d; `AccountRow` was tried and dropped because it measurably changes nothing. Everything else is left alone on purpose, and the ADR says why. Numbers, method and the `npm run bench` script are in `docs/adr/0008-memoization-strategy.md`.
