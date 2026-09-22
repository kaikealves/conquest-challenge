# 29: Company identification

**What to build:** A Report is now known to belong to one Company. The user can
see whose data they are looking at — in the page header and in the Excel export
— without a selector, because this build genuinely has one Company's data.

**Blocked by:** 11 (Report fetched and rendered), 17 (Excel export).

**Status:** resolved

- [x] `ReportTemplateIndex` and `Report` each carry a `Company`
- [x] The page shows the Company as soon as the ReportTemplate index loads, in every state
- [x] The exported Excel file's title row shows the Company, so a spreadsheet
      emailed out is self-describing without the page around it
- [x] The importer's Company-name argument is optional; when it is given, it is
      used as-is; when it is not, it is derived from the payload's filename —
      the committed code contains only that rule, never a name derived from
      `brief/`
- [x] `npm run dev:real` is unchanged: it passes no Company name, so it falls
      through to the filename-derived default and shows the real Company
      locally, the same way it already shows real figures
- [x] Mocks and fixtures use an invented Company name, like every other mock
      figure
- [x] ADR recorded: Company is carried through the contract unchanged rather
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

## Delivered

- `Company` (`{ name: string }`) on the importer's `Report` and on a new `ReportTemplateIndex` (`{ company, templates }`) — once per index, not once per template entry.
- The importer's third CLI argument is optional; omitted, it derives a label from the payload's filename (`companyName.ts`), and that rule is generic string handling, never a name derived from `brief/`.
- `ReportsPage.tsx` shows the Company as an `<h2>` in every state once the index has loaded, including the "no such ReportTemplate" and "no Reports yet" states.
- `useReport`/`useTemplates` treat a payload missing `company` as a failed load, matching the existing `unmatched` guard.
- The Excel export's title row includes the Company.
- `CONTEXT-MAP.md` plus a full glossary entry in both `tools/importer/CONTEXT.md` and `src/features/reporting/CONTEXT.md` (review found the first draft only had the relationship summary, not the term itself — added to match how AccountCode/Money are documented).

Review also caught a real mistake: the first draft of `companyName.test.ts` used the real ledger's actual filename and asserted its derived label — a fact about the real Company, committed. Fixed to a synthetic fixture name.
