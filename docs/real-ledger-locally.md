# Running the application on the real ledger

`npm run dev` answers `/data/` with invented figures from MSW. To look at the
Reports the importer computes from the real sample ledger instead:

```bash
npm run dev:real
```

This runs the importer over `brief/brignolles-gl.xml`, writes its output to
`.local/real-ledger/data/`, and starts the dev server in `real` mode with the
mock API off. It needs the sample at that path; `brief/` is not in the repository.

Since ticket 30 it also imports a second, synthetic Company (a small UK-style
fixture — never the real ledger) into the same output, so the Company switcher
is demonstrable against your real data: pick your real Company from the chooser
to compare against the synthetic one's differently structured chart.

## Why it is local-only, and how that is enforced

The sample is a third party's real accounting record, and anything computed from
it inherits that. So:

- The output goes to `.local/`, which is gitignored, and **not** to `public/`.
  `npm run build` copies `public/` into `dist/`, so real figures written there
  would ship in the next build. `.local/` is served only by `real` mode.
- `vite build --mode real` refuses to run, since the same copy would put the
  real ledger in `dist/`.
- Plain `npm run dev` is unchanged: MSW, no importer, nothing required.
- Each run replaces that Company's own previous Reports (not another
  Company's), so a Period the current ledger lacks is not left behind, and
  importing your real Company again never disturbs the synthetic one.
- If an ordinary `npm run dev` was opened on the same address before, its mock
  service worker is still installed in the browser. `real` mode unregisters it
  on load, so the mock cannot keep answering.

## Another ledger, or another Company

Run the importer yourself — `country` is required, since nothing about a
payload says which chart-of-accounts convention it follows; `company-id` and
`company-name` are optional, derived from the payload's filename when omitted
— then point `real` mode at the directory that holds `data/`:

```bash
npm run import -- path/to/payload.xml some-dir/data --country=FR
REAL_LEDGER_PUBLIC_DIR=some-dir npm run dev -- --mode real
```

Run `import` again with a different payload and the same output root to add a
second Company rather than replace the first — that is what `dev:real` itself
does. `e2e/real-ledger.spec.ts` uses exactly this with two small fixtures,
never the real ledger.
