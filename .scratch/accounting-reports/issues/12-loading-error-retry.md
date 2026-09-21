# 12: Loading, error and retry states

**What to build:** The user always knows what the application is doing. A Report in flight shows a loading indicator, a failure shows a clear message with a working retry, and stale data from a previous request never displays.

**Blocked by:** 11 (Report fetched and rendered).

**Status:** resolved

- [x] A loading indicator shows while a Report is in flight
- [x] A failed request shows a clear error message, not a blank screen
- [x] Retry works without reloading the page
- [x] Changing the Period never shows the previous Period's Report
- [x] An empty result is distinguishable from a failure
- [x] Concurrent requests for the same Report are deduplicated

## Comments

`ReportScreen` has four outcomes rather than three, kept apart because a user
acts differently on each: still working, failed and worth retrying, arrived but
empty, arrived with figures. Collapsing empty into failure would have someone
chasing an outage that is really a Period with nothing posted to it.

Retry is `refetch` behind a button, so nothing reloads. Clicking it returns the
screen to its loading state, because TanStack reports a refetch of a query with
no data as pending — the first version tried to disable the button and show
"Trying…" instead, which was unreachable code.

The error text does not show the API's message. `docs/api-contract.md` says that
message is for a developer reading a network tab, so it goes to the console and
the user gets a sentence naming the two things actually likely — a dropped
connection, or no Report for this Period.

One live region, always mounted, carries the current state to assistive
technology. A region inserted into the page with its content already inside it
is commonly missed, because assistive technology watches regions it already
knows about; mounting it empty and then filling it is what makes every
transition announced, including the Report arriving, which nothing else marks.
The visible text carries no role of its own, or each change would be announced
twice. The retry button sits outside the region: an alert containing a button
announces it as flat text and re-announces everything when its label changes.

`ReportScreen` now takes the ReportTemplate and Period as props, with `App`
passing constants. Tickets 14 and 15 put them in the URL; the props exist now
because the stale-data rule cannot be tested without being able to change the
Period.

### Two tests that did not test what they claimed

Worth recording, because both passed and neither meant anything.

The stale-data test used `waitFor` to assert the old total was gone. `waitFor`
retries until the assertion holds, so it passed whether or not the previous
Period's figures were on screen in the meantime — which is the entire bug.
Verified by adding `placeholderData: keepPreviousData`, the exact defect, and
watching the test stay green. It now asserts immediately after the Period
changes, with no waiting, and fails against that defect.

Two more tests passed while `ReportScreen` took no props at all, because Vitest
does not typecheck: the extra props were silently ignored, so both renders used
the same Period. `npm run typecheck` caught it.

### On the retry policy

A 500 is retried once automatically, so the error state appears later than a
test's default one-second timeout allows — the first test to exercise it failed
for that reason rather than for a real one. The failure tests now use a 404,
which is permanent and not retried, and the retry test fails the server for the
first request and its automatic retry so the user's own click is what fixes it.

### Still missing

There is no error boundary, so a throw during render still blanks the page. The
one place that used to throw — a malformed amount — was fixed in ticket 11, but
the general case stands. React needs a class for an error boundary, which this
repo does not use, so closing it means adding `react-error-boundary`. Left out
rather than added quietly.

### Review fixes

**The retry-in-flight UI was dead code.** `disabled={isFetching}` and the
"Trying…" label could never render: TanStack reports `status: 'pending'` while
refetching a query that has no data, so the loading branch wins every time.
Measured at three of three renders in the error branch. The comment above
claiming the opposite was written without checking. Removed rather than made to
work — returning to the loading state on retry is the honest behaviour.

**The empty state asserted something the payload never says.** It read "Nothing
was posted to the Accounts this ReportTemplate covers", but an empty Report
equally means a ReportTemplate whose CategoryRoots match nothing — a
configuration fault the screen would have reported as a quiet day. It now says
only that the Report has no Categories for the Period.

**`role="alert"` wrapped the retry button**, so the button was announced as part
of the alert text and every label change re-announced the whole region. The
error text and the button are now separate, with the persistent live region
doing the announcing.

**The empty state was silent** to a screen reader while the failure state was
announced, so the distinction the ticket asks for existed only for a sighted
user. The live region now covers all four states.

**The retry test encoded the retry policy.** It failed the server for exactly
two attempts, which is the current automatic-retry count plus one; changing the
policy would have silently changed what the test proved. The server now stays
down until the test lets it recover.

Also: the test file's docblock claimed everything was asserted through the
rendered application, while two tests render one component — it now says which
and why; `showing()` renamed to `changePeriodTo()`; and each state was
re-checked by breaking it and watching the matching test go red.

### Deviations worth surfacing

`CLAUDE.md` names shadcn/ui for interactive primitives, and the retry button is a
plain `<button>` with Tailwind classes. shadcn is not in the repo at all — no
`components.json`, no Radix, no CVA — and its Button is a styled `<button>`.
Pulling that toolchain in for one control seemed disproportionate, but it is a
documented choice being deviated from, so it is recorded here rather than left
quiet. Ticket 13's expand controls are the point at which to reconsider.

### Still missing

No error boundary, so a throw during render still blanks the page; closing it
means adding `react-error-boundary`, since React needs a class and this repo does
not use them. Keyboard focus is lost on retry: the button unmounts as the
loading state replaces it, and focus falls to the document. Both are left for a
ticket that owns them rather than fixed quietly here.
