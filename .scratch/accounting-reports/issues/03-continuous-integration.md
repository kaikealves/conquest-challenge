# 03: Continuous integration

**What to build:** Every push runs the full quality gate automatically, so a regression is caught before review rather than during it.

**Blocked by:** 02 (Test harness).

**Status:** resolved

- [x] A workflow runs lint, type-check, component tests and end-to-end tests on push and on pull request
- [x] The workflow fails when any one of those fails
- [ ] A green run is visible on the default branch — **only possible after merge**
- [x] Playwright browsers are cached or installed reliably in the runner

## Comments

One GitHub Actions workflow, `.github/workflows/ci.yml`, on push to `main` and on
every pull request. That is narrower than story 42's "every push": a push to a
branch with no pull request open runs nothing. It is the right shape given the
one-ticket-one-PR convention, which guarantees every branch has a PR, but the
gap is real and worth naming rather than glossing. One job, one step per gate, ordered by cost: formatting, lint,
type-check, component tests, build, then end-to-end. A step failing fails the job,
and naming each one means a red run says which gate broke rather than showing a
single opaque cross.

Node is pinned to 22, the current LTS. `package.json` allows `^20.19 || >=22.12`
and development happens on 20, so CI also proves the project builds on a newer
major than the one it is written on.

Browsers are cached at `~/.cache/ms-playwright`, keyed on the resolved
`@playwright/test` version rather than the lockfile hash — an unrelated
dependency bump should not force a 114 MB download. The key also names the
browsers installed, so adding a second browser later cannot hit this cache,
skip the install and leave it silently missing. The apt packages the browser
links against are not in that cache, so `install-deps` runs even on a hit;
without it a cache hit produces a browser that cannot start. The cache is only
written on success, so a branch failing end-to-end re-downloads each run.

`npm run build` duplicates the build Playwright's `webServer` does, so each run
compiles twice. That buys a named step — a broken build reports as "Build"
rather than as a web server that would not start — and the alternative, serving
a prebuilt `dist/`, is what ticket 02 moved away from because it lets a stale
bundle be tested by accident.

Three defects in the existing harness surfaced while wiring this up, all of them
things that would only ever have failed in CI:

- `trace: 'on-first-retry'` could never capture anything, because ticket 02's
  review dropped `retries`. Now `retain-on-failure`.
- The workflow uploaded `playwright-report/`, which the `list` reporter does not
  produce. The `html` reporter is now enabled under CI, which is also what
  carries the trace — verified by failing a test on purpose and confirming
  `trace.zip` is embedded in the uploaded report.
- Every action version was a major behind or more: `checkout` and `setup-node`
  were on v5 against a current v7, `cache` v4 against v6, `upload-artifact` v4
  against v7. Checked each major's release notes for breaking changes to the
  inputs used; all four are ESM migrations plus additions, so the pin is a
  straight bump.

The `github` reporter is enabled under CI so failures annotate the diff, and the
`list` reporter is kept locally where output is watched as it streams rather than
read afterwards. Ticket 02 removed both of these as premature; this is the ticket
that owns them.

Verified by replaying the exact step sequence against a clean clone with
`CI=true`, and by the workflow's own run on the pull request.

The pull request's run is green end to end
(https://github.com/kaikealves/conquest-challenge/actions/runs/35531937188): every
gate passed, the cache missed and took the `--with-deps` install, and the
hit-only `install-deps` step skipped as designed.

Two paths remain unexercised in CI, both only reachable from a red run: the
artifact upload, and `install-deps` on a cache hit. The upload was proven locally
by failing a test on purpose; the cache-hit branch will first run on the next
pull request after this merges, since a cache written on `main` is what PR runs
restore from.

The third criterion is left unticked deliberately. A run on the default branch
cannot exist until something lands on it, so nothing done on this branch can
satisfy it; the evidence available before merge is the pull request's own run,
and the `main` run follows the merge. Tick it then, not now.
