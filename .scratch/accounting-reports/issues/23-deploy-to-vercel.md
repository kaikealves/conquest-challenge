# 23: Deploy to Vercel

**What to build:** A live URL a reviewer can open without cloning anything. The mock API works in production builds, so the deployed application is fully functional.

**Blocked by:** 13 (Hierarchical Report).

**Status:** ready-for-agent

- [ ] The application builds and deploys as a static bundle
- [ ] The mock service worker is served correctly in production
- [ ] The deployed application is fully navigable, including expansion and selection
- [ ] The URL is recorded in the README
- [ ] Droppable without regret if time runs short

## Comments

Per ADR-0007 the site serves static JSON the importer wrote, so there is no mock
service worker in production and no server to run. The data deployed is the
synthetic ledger of ticket 25 — never anything derived from the supplied sample,
which is a third party's real accounting record.

A request for a Report that does not exist must return 404 rather than the SPA
shell, or the error and retry states have no real failure to handle. That is a
rewrite-rule detail worth checking on the deployed site rather than assuming.

## Added while doing ticket 14

Report addresses such as `/reports/beta` are now real client-side routes, so the
host needs an SPA fallback for them **and** must not apply it to `/data/`. A
rewrite of the form `/((?!data/|assets/).*)` → `/index.html` does both. Check on
the deployed site that a shared `/reports/<id>` link loads after a hard refresh,
and that a missing `/data/reports/x/y.json` still answers 404. `vite preview`
does its own fallback, so the end-to-end suite cannot prove either half.
