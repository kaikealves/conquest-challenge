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

Retry is `refetch` behind a button, so nothing reloads. The button disables
itself while the attempt is in flight and says "Trying…", because a retry that
looks inert invites a second click.

The error text does not show the API's message. `docs/api-contract.md` says that
message is for a developer reading a network tab; the user gets a sentence
naming the two things that are actually likely — a dropped connection, or no
Report for this Period.

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
