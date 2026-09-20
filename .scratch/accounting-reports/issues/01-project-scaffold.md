# 01: Project scaffold

**What to build:** A running application shell. `npm run dev` serves a page, `npm run build` produces a static bundle, and the codebase lints and type-checks clean.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Vite + React + TypeScript project runs in dev and builds for production
- [x] Tailwind is wired and a styled element proves it applies
- [x] ESLint and Prettier configured, with scripts to lint and format
- [x] Feature-first directory structure in place per ADR-0004, with the two bounded-context directories from CONTEXT-MAP.md
- [x] Type-check passes with no errors

## Comments

Vite 8.3 / React 19.3 / TypeScript 6.0 / Tailwind 4.3. Tailwind is configured
CSS-first in `src/index.css` via `@tailwindcss/vite`; there is no
`tailwind.config.js`. The utilities on the shell in `src/App.tsx` compile to real
CSS in both the dev server and the production bundle, which is what makes the
second criterion checkable rather than assumed.

`src/shared/` carries a README rather than empty layer directories, so the
ADR-0004 rule ("organised by layer internally, unlike the feature directories")
is discoverable where it applies. The two bounded-context directories already
existed with their `CONTEXT.md`; this ticket adds no structure beyond `shared/`.

Two deviations from a stock `create-vite` scaffold, both deliberate:

- `tsconfig.app.json` turns on `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. The pipeline tickets index heavily into
  account-code maps, and these catch the class of bug that silently drops money.
- ESLint runs `recommendedTypeChecked`, not plain `recommended`, so the lint pass
  sees types. Config files get their own `js`-only block, or they would be
  visited with zero rules and ticket 03's CI gate would have a hole in it.

`engines` records the Node floor Vite 8 needs, so story 45 ("clone and run
without additional setup") fails loudly rather than mysteriously. Verified by
cloning the branch fresh, running `npm ci` and building: same asset hashes.

`src/index.css` declares `color-scheme: light` and an explicit body background.
Without it the shell inherited the reader's dark-mode preference and rendered
dark text on a dark page — the styled element has to be legible to prove
anything.

Prettier now owns the whole repo, so adopting it renormalised markdown that
predates it: table padding in `CLAUDE.md` and one emphasis marker in ADR-0003.
That is a separate commit on the branch, mechanical and reviewable on its own,
and it keeps `format:check` usable as a CI gate in ticket 03.

Reviewed on both axes before merge. Three findings applied: the ESLint hole
above; an `@/*` path alias dropped as speculative, since it had no consumers and
was declared in both `vite.config.ts` and `tsconfig.app.json` where the two could
drift apart unnoticed; and a custom `@theme` font stack dropped as a design
decision no ticket has asked for yet.

No tests: the harness arrives in ticket 02, so there is no seam to test at yet.
The scaffold is verified by `typecheck`, `lint`, `format:check` and `build`
passing, and by the dev server rendering the styled shell.

One open question for the tracker, not for this ticket:
`docs/agents/issue-tracker.md` contradicts itself on the `Status:` line. Its
conventions section defers to the five triage strings in `triage-labels.md`, none
of which means "done"; its wayfinding section defines `claimed`/`resolved` for
exactly this file path. This ticket uses `resolved` as the only string in the
repo that means what happened.
