# 30: Company switcher

**What to build:** A real Company selector, reversing ticket 29's "no selector"
decision now that the user has asked for it. Company joins ReportTemplate and
Period in the URL. Company gains an `id` and a `country`; ReportTemplate gains a
`country`, so the importer and the picker both know which templates apply to
which company, rather than every template applying to everyone. A second,
synthetic Company with a genuinely different (UK-style) chart of accounts is
added, so switching visibly changes the category structure, not just the
numbers — demonstrating the exact reason the brief gives for ReportTemplates
varying: "French revenue accounts start with 7, whereas UK revenue accounts
usually start with 4."

**Blocked by:** 29 (Company identification).

**Status:** ready-for-agent

- [ ] `Company` gains `id` (stable slug) and `country` (ISO 3166-1 alpha-2)
- [ ] `ReportTemplate` gains `country`; the importer builds a Report only for
      templates whose country matches the Company it is importing for — today
      it builds every template file for every payload, which becomes wrong
      once templates for more than one country's chart exist side by side
- [ ] A new UK-style ReportTemplate (and a small synthetic UK fixture) exists,
      structurally different from the French ones, not just different figures
- [ ] `/data/companies.json` lists every Company; each Company's own Report
      index moves to `/data/companies/{companyId}/templates.json` and its
      Reports to `/data/companies/{companyId}/reports/{templateId}/{period}.json`
- [ ] The URL carries the Company: `/companies/:companyId/reports/:templateId/:period`.
      A bare `/` or `/companies/:companyId` resolves the same way ReportTemplate
      and Period already do — by redirect, never by guessing
- [ ] A `CompanyChooser`, matching the existing choosers' shape and
      accessibility reasoning
- [ ] Choosing a Company navigates to its bare address, letting Company →
      ReportTemplate → Period resolve fresh: a different country's chart makes
      "keep the same ReportTemplate" meaningless in general
- [ ] The importer's CLI takes `--company-id`, `--company-name` (optional,
      derived from the payload's filename as before) and `--country`
      (required — nothing about a payload lets this be derived); positional
      args for payload and output root are unchanged
- [ ] `npm run dev:real` imports the real Company _and_ the synthetic one into
      the same output root, so the switcher is demonstrable against real data
      locally, per ticket 29's precedent
- [ ] Tests at both seams: the importer skips a template whose country does
      not match; the app can switch Company and the ReportTemplate list, the
      Report shown, and the URL all change together

## Comments

Grilled with the user (2026-09-22): they asked "what if I want to change
between companies?" after ticket 29 shipped a Company with no selector. That
was deliberate at the time — see ADR-0009 — but the user asked for it built.
[ADR-0010](../../docs/adr/0010-company-switcher.md) records what changes and
what does not from ADR-0009's reasoning.
