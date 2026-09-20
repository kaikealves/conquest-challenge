# 04: Pipeline tracer — fixture to Report

**What to build:** The thinnest complete path through the pipeline: a small Provider payload fixture becomes a Report containing one Category with a correct total. Narrow but end to end, through both bounded contexts.

**Blocked by:** 02 (Test harness).

**Status:** ready-for-agent

- [ ] A build-time script reads a Provider payload and emits Report JSON
- [ ] Provider vocabulary terminates at the importer per ADR-0002; no provider term appears in the domain model
- [ ] Parsing streams rather than loading the whole document
- [ ] A ReportTemplate defined as data produces one Category with the correct total
- [ ] Money is decimal-based; no floating-point arithmetic on amounts
- [ ] A test at Seam 1 proves payload in, Report out, using a small purpose-built fixture
