# 10: The REST contract as static JSON

**What to build:** The REST contract the frontend consumes, satisfied by static JSON the importer writes. Endpoints expose Reports, not raw Entries — the client never receives the general ledger. This is the specification a future backend must satisfy at the same URLs.

**Blocked by:** 04 (Importer tracer).

**Status:** ready-for-agent

- [ ] `GET /data/reports/{template}/{period}.json` returns a Report, already aggregated
- [ ] `GET /data/templates.json` lists the available ReportTemplates and the Periods each has
- [ ] A Report carries its Categories, their totals, their nested children and the Accounts within them
- [ ] A ReportTemplate is identified in the URL by a stable slug, not its display name
- [ ] The payload schema is written down as the contract a backend must satisfy
- [ ] A request for a Report that does not exist returns 404, so error handling has a real failure to handle
- [ ] MSW handlers serve the same shapes in tests and dev, including a forced 500

## Comments

Reshaped by ADR-0007. The contract used to be MSW handlers in every environment;
it is now the URL shape and payload schema that static files satisfy, with MSW
kept for tests and dev where forcing a 500 is useful.

The 404 is load-bearing rather than incidental: static hosting gives a genuine
failure for an unknown template or Period, which is what stories 29, 30 and 15
need and what a simulated error cannot be.

Pre-computing every Report is one file per template and Period — around a dozen
at five fiscal years. The point where that stops being reasonable is the point
where the backend this design describes earns its place, and the dossier should
say so.

A template's URL slug must be stable and separate from its display name, because
story 13 puts it in a shareable URL. Renaming "French chart of accounts" must not
break a bookmark.
