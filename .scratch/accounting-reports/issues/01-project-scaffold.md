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
`tailwind.config.js`. The `@theme` block and the styled shell in `src/App.tsx`
compile to real utilities in both dev and the production bundle.

`src/shared/` carries a README rather than empty layer directories, so the ADR-0004
rule ("organised by layer internally, unlike the feature directories") is
discoverable where it applies. The two bounded-context directories already
existed, each holding its `CONTEXT.md`.

Three deviations from a stock `create-vite` scaffold, each deliberate:

- `tsconfig.app.json` turns on `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. The pipeline tickets do a lot of indexing into
  account-code maps, and these catch the class of bug that silently drops money.
- ESLint runs `recommendedTypeChecked`, not plain `recommended`, so the lint pass
  sees types.
- `engines` records the Node floor Vite 8 needs, so story 45 ("clone and run
  without additional setup") fails loudly rather than mysteriously.

Prettier now owns the whole repo, so running `npm run format` normalised markdown
that predates it — table padding in `CLAUDE.md` and one `*emphasis*` in ADR-0003.
Content is unchanged; this keeps `format:check` usable as a CI gate in ticket 03.

No tests: the harness arrives in ticket 02, so there is no seam to test at yet.
The scaffold is verified by `typecheck`, `lint`, `format:check` and `build` all
passing, and by the dev server rendering the styled shell.
