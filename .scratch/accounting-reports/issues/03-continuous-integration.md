# 03: Continuous integration

**What to build:** Every push runs the full quality gate automatically, so a regression is caught before review rather than during it.

**Blocked by:** 02 (Test harness).

**Status:** resolved

- [x] A workflow runs lint, type-check, component tests and end-to-end tests on push and on pull request
- [x] The workflow fails when any one of those fails
- [x] A green run is visible on the default branch
- [x] Playwright browsers are cached or installed reliably in the runner

## Comments

One GitHub Actions workflow, `.github/workflows/ci.yml`, on push to `main` and on
every pull request. One job, one step per gate, ordered by cost: formatting, lint,
type-check, component tests, build, then end-to-end. A step failing fails the job,
and naming each one means a red run says which gate broke rather than showing a
single opaque cross.

Node is pinned to 22, the current LTS. `package.json` allows `^20.19 || >=22.12`
and development happens on 20, so CI also proves the project builds on a newer
major than the one it is written on.

Browsers are cached at `~/.cache/ms-playwright`, keyed on the resolved
`@playwright/test` version rather than the lockfile hash — an unrelated
dependency bump should not force a 114 MB download. The apt packages the browser
links against are not in that cache, so `install-deps` runs even on a hit;
without it a cache hit produces a browser that cannot start.

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

Verified by running the exact step sequence against a clean clone with `CI=true`,
and by the workflow's own run on the pull request. The green run on `main`
follows the merge, since that is the only way a default-branch run can exist.
