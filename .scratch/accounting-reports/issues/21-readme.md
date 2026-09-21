# 21: README

**What to build:** What a reviewer reads first. Clone, install, run, test — with no additional setup and no unstated assumptions.

**Blocked by:** 11 (Report fetched and rendered).

**Status:** ready-for-agent

- [ ] Install and run instructions work from a fresh clone
- [ ] Test commands are documented for each suite
- [ ] The architecture is summarised with links to CONTEXT-MAP.md and the ADRs
- [ ] It states where to place the sample ledger for an optional full run, and why it is not committed
- [ ] Scope decisions and deliberate omissions are stated plainly
- [ ] It says which component satisfies the brief's "React component that fetches data from a mock API (e.g. JSONPlaceholder), manages loading/error states": the Report screen, with MSW as the mock API (ticket 16 was closed `wontfix` on that reading)
