# 18: Memoization pass

**What to build:** A deliberate optimisation pass over the Report view, with the reasoning recorded. The brief asks for the strategy to be explained, so the justification matters as much as the change.

**Blocked by:** 13 (Hierarchical Report).

**Status:** ready-for-agent

- [ ] The Category tree aggregation is memoized, because it is real CPU work
- [ ] Report rows are memoized so expanding one row does not re-render the tree
- [ ] Memoization is not applied by reflex elsewhere; the restraint is deliberate and stated
- [ ] The reasoning is written down, including why request deduplication is the first-order win and render memoization second
- [ ] A measurement or profile supports the claim rather than asserting it
