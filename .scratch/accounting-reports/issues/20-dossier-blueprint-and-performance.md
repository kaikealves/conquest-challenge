# 20: Dossier — architectural blueprint and performance

**What to build:** The architectural blueprint with Java/Kotlin recommendations, the argued rationale for every significant choice, and the performance analysis. This is the highest-value written deliverable and must not be squeezed out.

**Blocked by:** 19 (Dossier — data model and services model).

**Status:** ready-for-agent

- [ ] The backend architecture is described with named framework and library recommendations
- [ ] The import path is presented as asynchronous, streaming, idempotent and validated at the boundary
- [ ] Every significant choice is argued against the alternatives that were rejected
- [ ] The performance analysis identifies the import path as the bottleneck, grounded in the twelve-second sample duration
- [ ] Mitigations are proposed: pre-aggregation, caching of closed FiscalYears, partitioning, parallelism across companies
- [ ] Deliberate omissions are stated explicitly rather than left silent
