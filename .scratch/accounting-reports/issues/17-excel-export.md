# 17: Excel export

**What to build:** The user exports the Report they are looking at to Excel, so it can be shared with people who do not use the application.

**Blocked by:** 13 (Hierarchical Report).

**Status:** resolved

- [ ] The current Report exports to a downloadable Excel file
- [ ] The Category hierarchy is preserved in the exported structure
- [ ] Amounts export as numbers, not formatted text, so they can be computed with
- [ ] The export reflects the ReportTemplate and Period currently displayed
- [ ] Export runs client-side from the Report already in memory

## Added by ticket 09

A Report's `unmatched` group is a sibling of `categories`, not inside it, so an export that walks `categories` alone silently drops it: the loss ticket 09 exists to prevent. The export must include it, empty or not. The Result stays an ordinary Category.

## Delivered

- An _Export to Excel_ button beside the Report title. It builds the file in the browser from the Report already in memory and downloads it as `{templateId}-{period}.xlsx`.
- One sheet: title row (ReportTemplate, Period, currency), a header, then Categories depth-first with their Accounts beneath. Each row carries an Excel **outline level**, so Excel folds a Category away as the screen does; depth is also indented.
- Amounts are numbers, credits negative, shown with parentheses via the cell format. Accounts' codes are text so a leading zero survives.
- The `unmatched` group is always exported, empty or not; the Result is an ordinary Category.
- ExcelJS is loaded on demand: it is a separate ~930 kB chunk, not part of the bundle a visitor downloads to read a Report.
- **Known limits:** a spreadsheet cell is a double, so an amount past 15 significant digits is rounded by Excel itself (the on-screen figure stays exact). Excel groups at most 8 levels deep; deeper rows share the last level and stay indented. `npm audit` reports 2 moderate advisories, both in `uuid` under ExcelJS; the flagged call form is not one ExcelJS uses for this, and the only "fix" offered is a downgrade to a much older ExcelJS.
