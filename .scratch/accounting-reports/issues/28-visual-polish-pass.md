# 28: Visual polish pass

**What to build:** A pass over the application shell, the ReportTemplate/Period pickers and the Report surface so the app reads as a professional accounting tool rather than an unstyled prototype. Cosmetic only — no behaviour, no new data on screen.

**Blocked by:** None.

**Status:** resolved

- [x] The page shell (`App.tsx`) has real visual hierarchy: a header with more weight, a sensible content width, consistent spacing
- [x] `TemplateChooser` and `PeriodChooser` look like a deliberate combobox (border, shadow, focus ring, chevron) instead of a bare native control
- [x] The Report surface (`ReportTable`) reads as a card: contained, bordered, with clearer separation between the header, the unmatched notice and the table body
- [x] No behavioural change: same elements, same roles, same test seams

## Notes

Raised directly by the user, not by the brief — a "make it look professional" ask on the last day of the take-home, with a side request to lean on tables over dropdowns for navigation.

Two decisions worth recording because they overrode the obvious reading of the request:

- **The pickers stay native `<select>` elements.** `TemplateChooser.tsx` already carries a comment explaining why: a native select is keyboard- and screen-reader-accessible without any code of ours, and `templateSelection.test.tsx` / `periodSelection.test.tsx` (13 tests) assert against native-select behaviour (`userEvent.selectOptions`, `querySelectorAll('option')`, `toHaveDisplayValue`). A Radix-based shadcn `Select` would reverse that documented decision and rewrite all of it for a cosmetic ask. Surfaced to the user, who chose to keep the native element and have it restyled instead — same DOM semantics, new Tailwind classes only.
- **The Report body was already a table.** `ReportTable.tsx` renders a real `<table>`; "more tables instead of dropdowns" turned out to mean the pickers should look less like a bare form control, not that the Report needed a table it already had.

## Delivered

Restyled `TemplateChooser` and `PeriodChooser` (still native `<select>`, `appearance-none` plus an overlaid chevron, borders/shadow/focus-visible ring), gave `App.tsx`'s header and container more visual weight, and wrapped `ReportTable` in a bordered card with clearer section separation. No new dependencies, no change to DOM roles or test seams — all existing tests pass unchanged.
