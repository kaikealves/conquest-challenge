# 17: Excel export

**What to build:** The user exports the Report they are looking at to Excel, so it can be shared with people who do not use the application.

**Blocked by:** 13 (Hierarchical Report).

**Status:** ready-for-agent

- [ ] The current Report exports to a downloadable Excel file
- [ ] The Category hierarchy is preserved in the exported structure
- [ ] Amounts export as numbers, not formatted text, so they can be computed with
- [ ] The export reflects the ReportTemplate and Period currently displayed
- [ ] Export runs client-side from the Report already in memory

## Added by ticket 09

A Report's `unmatched` group is a sibling of `categories`, not inside it, so an export that walks `categories` alone silently drops it: the loss ticket 09 exists to prevent. The export must include it, empty or not. The Result stays an ordinary Category.
