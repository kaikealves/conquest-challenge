# 12: Loading, error and retry states

**What to build:** The user always knows what the application is doing. A Report in flight shows a loading indicator, a failure shows a clear message with a working retry, and stale data from a previous request never displays.

**Blocked by:** 11 (Report fetched and rendered).

**Status:** ready-for-agent

- [ ] A loading indicator shows while a Report is in flight
- [ ] A failed request shows a clear error message, not a blank screen
- [ ] Retry works without reloading the page
- [ ] Changing the Period never shows the previous Period's Report
- [ ] An empty result is distinguishable from a failure
- [ ] Concurrent requests for the same Report are deduplicated
