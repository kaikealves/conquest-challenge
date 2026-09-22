# 29: Company identification

**What to build:** A Report is now known to belong to one Company. The user can
see whose data they are looking at — in the page header and in the Excel export
— without a selector, because this build genuinely has one Company's data.

**Blocked by:** 11 (Report fetched and rendered), 17 (Excel export).

**Status:** ready-for-agent

- [ ] `ReportTemplateIndex` and `Report` each carry a `Company`
- [ ] The page header shows the Company as soon as the ReportTemplate index loads
- [ ] The exported Excel file's title row shows the Company, so a spreadsheet
      emailed out is self-describing without the page around it
- [ ] The importer's Company-name argument is optional; when it is given, it is
      used as-is; when it is not, it is derived from the payload's filename —
      the committed code contains only that rule, never a name derived from
      `brief/`
- [ ] `npm run dev:real` is unchanged: it passes no Company name, so it falls
      through to the filename-derived default and shows the real Company
      locally, the same way it already shows real figures
- [ ] Mocks and fixtures use an invented Company name, like every other mock
      figure
- [ ] ADR recorded: Company is carried through the contract unchanged rather
      than reinterpreted at the Ledger/Reporting boundary, and deliberately has
      no selector despite the brief's stated multi-company scale

## Comments

Raised by the user after reaching the running app and finding no indication of
whose data a Report is. Confirmed against the brief: it explicitly targets
"hundreds or thousands of companies," so Company is a real concept the design
must address — but the sample ledger carries no company field anywhere (checked:
absent from every Entry and from the brief PDF itself), so "which company" is
metadata about the import job, not something parsed from the data.

Deliberately not built: a Company selector, or a second (necessarily synthetic)
Company's data. There is one real Company's ledger; faking a second would
overdo a technical challenge that does not require demonstrating multi-tenancy
in the running app, only in the written design (tickets 19/20).

Grilled with the user (2026-09-22) before starting; see
`docs/adr/0009-company-is-a-shared-passthrough.md` for the settled design.
