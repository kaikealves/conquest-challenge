# 02: Test harness

**What to build:** The ability to write and run both kinds of test. One trivial test of each kind passes, establishing the conventions later tickets follow.

**Blocked by:** 01 (Project scaffold).

**Status:** resolved

- [x] Vitest and React Testing Library run component tests
- [x] Playwright runs an end-to-end test against the built app
- [x] MSW is installed with both browser and Node entry points sharing one set of handlers
- [x] One passing component test and one passing e2e test exist as prior art
- [x] Scripts exist to run each suite independently and all together

## Comments

Vitest 4 on jsdom with React Testing Library, Playwright 1.63 on Chromium, MSW
2.15. Scripts: `test`, `test:watch`, `test:e2e`, `test:all`.

`src/shared/mocks/handlers.ts` holds one handler array; `node.ts` and
`browser.ts` are two entry points over it. Per ADR-0003 those handlers are the
API contract rather than a test double, so `main.tsx` starts the worker in every
environment — including the production bundle — and waits for it before
rendering. That also makes `msw` a runtime dependency rather than a dev one:
it ships in the bundle, so as a devDependency `npm ci --omit=dev` would fail to
build.

They live under `src/shared/` because ADR-0004 gives exactly two homes, a
feature directory or `shared` for code no feature owns, and says `shared` is the
one place organised by layer internally. A top-level `src/mocks/` would have
been MSW's own convention but a third home the ADR does not provide.

The end-to-end suite runs against the production bundle via `preview`, not the
dev server, so it exercises what ships. `reuseExistingServer` is false even
locally: reusing whatever answers on the port would skip the build and quietly
test a stale `dist/`.

Two bugs found while building this, both now covered by comments where they
would recur:

- A handler declared as a same-origin path must be fetched against the document
  origin. An absolute URL to another host misses it. This surfaced only because
  Vitest is configured to fail on unhandled requests rather than bypass them.
- The browser test raced service-worker registration and got `index.html` back.
  A service worker does not control the page the instant navigation resolves, so
  the spec waits for the shell, which renders only after the worker starts.
  Verified non-flaky over repeated runs.

Reviewed on both axes. Applied: mocks moved under `shared` as above;
`onUnhandledRequest` in the browser changed from `bypass` to `warn`, since an
unclaimed path has no real server to fall through to and would be served
`index.html` (MSW exempts static assets, and the console is clean on a normal
load); a shared `tsconfig.base.json` extracted, the three leaf projects having
drifted into repeating a dozen flags; the `github` reporter dropped from the
Playwright config as ticket 03's business; worker startup failure no longer
blank-screens the app.

Both reviewers flagged the same real tension, recorded here rather than
resolved: `handlers.test.ts` and `mock-backend.spec.ts` assert below the seams
CLAUDE.md recognises — they call `fetch` directly instead of driving the
application. At ticket 02 there is no pipeline and nothing rendered fetches
anything, so the "both entry points share one array" criterion cannot be proven
any other way. Both files say so in a header comment and say what to do instead
from ticket 11. They are evidence for this ticket, not a pattern to copy.

One consequence worth carrying forward: MSW's browser build is 420 kB raw,
158 kB gzipped — larger than React — and it is on the critical path, since
rendering waits for it. That is the price of ADR-0003 rather than a defect, but
ticket 20's performance section should account for it and ticket 23 will ship
it.
