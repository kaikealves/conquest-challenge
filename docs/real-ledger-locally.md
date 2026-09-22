# Running the application on the real ledger

`npm run dev` answers `/data/` with invented figures from MSW. To look at the
Reports the importer computes from the real sample ledger instead:

```bash
npm run dev:real
```

This runs the importer over `brief/brignolles-gl.xml`, writes its output to
`.local/real-ledger/data/`, and starts the dev server in `real` mode with the
mock API off. It needs the sample at that path; `brief/` is not in the repository.

## Why it is local-only, and how that is enforced

The sample is a third party's real accounting record, and anything computed from
it inherits that. So:

- The output goes to `.local/`, which is gitignored, and **not** to `public/`.
  `npm run build` copies `public/` into `dist/`, so real figures written there
  would ship in the next build. `.local/` is served only by `real` mode.
- `vite build --mode real` refuses to run, since the same copy would put the
  real ledger in `dist/`.
- Plain `npm run dev` is unchanged: MSW, no importer, nothing required.
- Each run replaces the previous run's Reports, so a Period the current ledger
  lacks is not left behind.
- If an ordinary `npm run dev` was opened on the same address before, its mock
  service worker is still installed in the browser. `real` mode unregisters it
  on load, so the mock cannot keep answering.

## Another ledger

Run the importer yourself, then point `real` mode at the directory that holds
`data/`:

```bash
npm run import -- path/to/payload.xml some-dir/data
REAL_LEDGER_PUBLIC_DIR=some-dir npm run dev -- --mode real
```

`e2e/real-ledger.spec.ts` uses exactly this with a small fixture, never the real
ledger.
