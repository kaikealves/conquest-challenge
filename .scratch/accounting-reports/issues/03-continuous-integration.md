# 03: Continuous integration

**What to build:** Every push runs the full quality gate automatically, so a regression is caught before review rather than during it.

**Blocked by:** 02 (Test harness).

**Status:** ready-for-agent

- [ ] A workflow runs lint, type-check, component tests and end-to-end tests on push and on pull request
- [ ] The workflow fails when any one of those fails
- [ ] A green run is visible on the default branch
- [ ] Playwright browsers are cached or installed reliably in the runner
