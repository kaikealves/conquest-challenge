# 10: The REST contract as static JSON

**What to build:** The REST contract the frontend consumes, satisfied by static JSON the importer writes. Endpoints expose Reports, not raw Entries — the client never receives the general ledger. This is the specification a future backend must satisfy at the same URLs.

**Blocked by:** 04 (Importer tracer).

**Status:** resolved

- [x] `GET /data/reports/{template}/{period}.json` returns a Report, already aggregated
- [x] `GET /data/templates.json` lists the available ReportTemplates and the Periods each has
- [x] A Report carries its Categories, their totals, their nested children and the Accounts within them
- [x] A ReportTemplate is identified in the URL by a stable slug, not its display name
- [x] The payload schema is written down as the contract a backend must satisfy
- [x] A request for a Report that does not exist returns 404, so error handling has a real failure to handle
- [x] MSW handlers serve the same shapes in tests and dev, including a forced 500

## Comments

The contract is written down twice on purpose, and neither copy imports the
other. `src/features/reporting/api/contract.ts` is what the application expects;
`tools/importer/reporting/report.ts` is what the importer produces. A client and
a server agree on a payload, not on a module — a Kotlin backend could not import
a TypeScript type — so `contract.test.ts` runs the importer over a fixture and
assigns its output to the client's type. Verified that it bites: change an
amount to a number in the importer and that file stops compiling.

A Category now carries `children` and `accounts`. An Account is placed at the
deepest Category matching it, so it is listed and counted exactly once; a
parent that also listed it would show the same money twice. A parent's total is
its children plus whatever it holds directly. That rule is what resolves parent
and child overlapping; sibling overlap is still ticket 08's.

`PERIOD_THAT_FAILS` gives tests a 500. Static hosting can return 404 for a
Report that does not exist but never a 500, so a forced failure needs a
mechanism, and making it a Period rather than a query flag means the client
needs no special code to reach it.

**The 404 does not happen by itself.** A single-page-app server answers every
unmatched path with `index.html`, so a missing Report returned `200 text/html`
and the client would have failed while parsing JSON — the error state would have
been a parse error rather than a missing Report. A preview-server middleware now
excludes the API prefix from the fallback, installed _before_ the internal
middlewares rather than after, since returning it meant the fallback had already
answered. It checks the file system so real data files still serve. Ticket 23
needs the same exclusion in the host's rewrite rules, and the end-to-end test
here is what would catch its absence.

**MSW is gone from the production bundle.** It now loads behind
`import.meta.env.DEV`, taking the build from 642 kB to 220 kB — the 158 kB
gzipped saving ADR-0007 predicted. An end-to-end test asserts no shipped script
mentions `setupWorker` or `mockServiceWorker`, so it cannot creep back.

Verified against the real ledger: every Category total in every Period matches a
prefix-sum over the raw XML computed independently with `Decimal`, every parent
equals the sum of its children plus its own Accounts, and no Account is listed
twice anywhere in a Report.

`docs/api-contract.md` is the language-neutral half of the contract — the URL
table, an example of each payload, and the seven rules a backend must satisfy.
The TypeScript is for the client; a Kotlin author cannot import it.

### Review fixes

The handler tests asserted the fixture the same module defines: `expect(total)
.toBe('500.50')` twenty lines below `total: '500.50'` cannot fail for a domain
reason. They now assert what a client can rely on — status codes, error shape,
slug-not-name, and the structural invariants the payload promises. Checked by
moving a fixture total one cent: the invariant test fails.

MSW's worker was still being deployed. `dist/mockServiceWorker.js` shipped at
9,666 bytes, and the end-to-end test named for its absence only inspected
scripts the page had loaded, so it passed while the file sat there. The worker
now lives beside the other mocks and a development-only plugin serves it; `dist`
is three files. `msw` moved to devDependencies with it.

The API middleware now covers the dev server too. There the API is normally MSW,
but `main.tsx` deliberately renders when the worker fails to start, which is
exactly the case that would otherwise hand HTML to a JSON parser. It also
resolves and checks containment, so a URL carrying `..` cannot ask about a file
outside the served directory.

Category labels in the handlers now match those
`tools/importer/templates/french-chart.json` produces. They did not, so every
test written against them from ticket 11 onward would have asserted Categories
production never returns. The advertised `uk-chart` was dropped for the same
reason: no template file backs it, and ticket 25 introduces a second chart
properly.

`aggregateCategory` took the Accounts claimed by children from the subtrees it
had just built, rather than matching against every child a second time.

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
