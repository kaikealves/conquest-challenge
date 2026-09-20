# 10: Mock API contract

**What to build:** The REST contract the frontend consumes, defined as mock handlers. Endpoints expose Reports, not raw Entries — the client never receives the general ledger. This is the specification a future backend must satisfy.

**Blocked by:** 04 (Pipeline tracer).

**Status:** ready-for-agent

- [ ] An endpoint returns a Report for a given ReportTemplate and Period, already aggregated
- [ ] A separate endpoint lists the available ReportTemplates
- [ ] The response carries Categories, their totals, their nested children and the Accounts within them
- [ ] Errors use standard HTTP status codes with a message body
- [ ] A deliberate failure case is reachable, so error handling can be exercised
- [ ] The same handlers serve the browser and the Node test environment
