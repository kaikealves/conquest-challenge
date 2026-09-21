# 11: Report fetched and rendered

**What to build:** A Report appears on screen. It is fetched over HTTP through TanStack Query per ADR-0005 and rendered as a flat list of Categories with their totals — the first thing a user can actually look at.

**Blocked by:** 10 (Mock API contract).

**Status:** resolved

- [x] TanStack Query owns the server state; no data fetching in effects
- [x] Categories render with correct labels and totals
- [x] Amounts are formatted consistently with their currency
- [x] Debit and credit are distinguishable at a glance
- [x] Component and type names use the vocabulary from the Reporting glossary
- [x] A component test asserts the rendered totals match the fixture

## Comments

The first thing a user can look at. `ReportScreen` asks `useReport` for a Report,
`ReportView` renders its Categories, `CategoryRow` renders one line. Names come
from the Reporting glossary, and the components take a Category rather than a
label and a total, so ticket 13's recursion has somewhere to go.

TanStack Query owns the server state per ADR-0005. There is no `useEffect`
fetching anywhere, so caching, deduplication of concurrent requests for the same
Report, and the loading and error states come from one place. The query key is
the ReportTemplate and the Period, which is what will stop ticket 15's Period
switch showing a stale Report.

**Amounts are formatted from the decimal string, never through `Number`.**
`Intl.NumberFormat` accepts a string, and it matters:
`format('90071992547409.93')` gives 90,071,992,547,409.93 while
`format(Number(...))` gives .94. A figure computed exactly all the way from the
ledger would have been displayed a cent wrong at the last step. `lib` moved to
ES2023 for the typing, and the string is validated before being narrowed rather
than cast on faith.

**A credit is shown in parentheses and in a different colour**, as an accounting
report is read, rather than with a minus sign. Revenue carries a credit balance,
so Operating income reads `(EUR 783,315.09)`. Two signals rather than one:
colour alone excludes anyone who cannot distinguish it, and parentheses survive
a printout and a screen reader.

The ReportTemplate and Period are fixed at `french-chart` / `2016`; tickets 14
and 15 put them in the URL. Loading and error states are deliberately plain —
ticket 12 owns making them good, including retry without a page reload.

### A detour worth recording

The Report renders correctly in Chromium but appears stuck on "Loading" in the
Claude browser pane, which does not support service workers, so MSW cannot
intercept there. Time went into moving the mock worker out of `public/` and
serving it from middleware, on the theory that the middleware was at fault. It
was not — and serving a worker from middleware satisfies `curl` but not a real
registration, which fetches the script under stricter rules. The worker is back
in `public/` where it works, and a build plugin removes it from `dist` instead,
so the deployed site still carries no mock. `e2e/report-api.spec.ts` holds that
true.

### Review fixes

**The mock fixture held the real company's figures.** `182433.83` and
`783315.09` are SPV Brignolles' actual totals, taken from `brief/` in ticket 10
and committed. `CLAUDE.md` forbids exactly that, and a summary of a third
party's ledger is still their data. The fixture now carries invented figures
under the Category labels the real ReportTemplate produces, internally
consistent so the contract's parent-equals-parts rule still holds. It was also
missing a top-level Category the template defines, which no test could have
caught.

**`isCredit` treated `-0.00` as a credit**, so a Category netting to zero was
coloured and announced as income. It now tests the magnitude, and a signed zero
is normalised before formatting — left alone, `Intl` renders `-0.00` as
`(0.00)`.

**The validation ran on the wrong string.** The sign was stripped before the
pattern was applied, so `--5` passed and printed as `5.00`. It now validates the
whole string, and returns the raw text instead of throwing: throwing happens
inside render and takes the page down with it, and a blank screen tells a user
less than an odd-looking number does.

**Parentheses do not reach a screen reader.** The claim that they "survive a
screen reader" was wrong — punctuation is not announced by default and colour is
invisible, so a screen-reader user received neither signal. A credit now also
carries a visually hidden word, verified by removing it and watching the test
fail. `currencySign: 'accounting'` produces the parentheses now, so they are the
locale's rather than ASCII ones wrapped on by hand.

**`ReportView` used a word the glossary proscribes** — the Report entry lists
`view` under _Avoid_. It is `ReportTable`, named for the shape it draws.

**Tests and production used different QueryClients**, so the retry policy that
ships was exercised by nothing. One factory builds both, and it does not retry a
4xx: asking again for a Report that does not exist returned the same 404 four
times and turned a clear failure into a five-second wait.

Also: a fixed display locale, so a Report reads the same for two colleagues and
the tests do not depend on the machine they run on; `useId` rather than a
hardcoded DOM id; a key carrying position, since the contract does not promise a
Category label is unique; and the error state no longer shows the API's message,
which `docs/api-contract.md` says is for a developer reading a network tab.
