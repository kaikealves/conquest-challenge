# Memoize what was measured to cost something, and nothing else

Accepted 2026-09-22. Updates the last consequence of
[ADR-0005](./0005-tanstack-query-owns-server-state.md).

The brief asks for optimisation "such as memoization (e.g. `React.memo`,
`useMemo`) or lazy loading", with the reasoning explained. This records what was
done, what was left alone, and the numbers that decided each.

## The first-order win is not a render optimisation

Requests are the most expensive thing this application does, and TanStack Query
removes most of them without any memoization: two components asking for the same
Report make one request (asserted in `reportStates.test.tsx`), and a Period the
user has already visited is shown from the cache at once while it revalidates.
A Report of about 5,800 rows is a 320 kB payload, and refetching that on every
mount would put a network round trip in front of every render saving below. So
deduplication and caching come first, and they are free. (A payload that size is
synthetic; the real sample's Reports are far smaller.)

## What was measured

Setup: a synthetic Report of 5,782 rows (5 × 5 × 5 × 5 Categories, eight
Accounts on each leaf), fully expanded, in jsdom. Run `npm run bench`
(`src/features/reporting/renderCost.bench.tsx`). jsdom is slower than a browser
in absolute terms, so read the ratios.

|                                                  | before   | after    |
| ------------------------------------------------ | -------- | -------- |
| Formatting one amount                            | 0.052 ms | 0.001 ms |
| A parent update that leaves the Report unchanged | 790 ms   | 0.3 ms   |
| — with only the formatter cache                  |          | 330 ms   |

## What was done

1. **One `Intl.NumberFormat` per locale and currency** (`formatAmount.ts`). This
   is memoization of real CPU work: constructing a formatter is what costs, and
   every row constructed one. It is a plain module-level cache, not a hook —
   the work is not tied to a component, and the pair set is one or two entries so
   it cannot grow. Halves the re-render cost by itself (790 → 330 ms) and makes
   the first draw of a large Report proportionately cheaper.
2. **`React.memo` on `CategoryRow`.** Its props are a Category, a currency and a
   depth. The Category comes out of the query cache, which keeps the same object
   while the data is unchanged, so the props are stable and the memo holds. A
   parent update (the ReportTemplate or Period chooser re-rendering, an export
   state change lifted later, a search box added later) then costs 0.3 ms instead
   of 790 ms across 5,782 rows.

Tests count rather than time (`renderCost.test.tsx`): every row draws one
amount, so calls to `formatAmount` are rows rendered. They fail if the memo is
removed or if a formatter is built per row.

## What was deliberately not done

- **No memoization of the Category tree aggregation.** The original plan
  assumed the client aggregates. It does not: [ADR-0006](./0006-importer-is-a-tool-outside-the-application.md)
  moved all accounting logic into the importer, so the application receives a
  finished tree and there is nothing to memoize. Wrapping the render in
  `useMemo` to "memoize the tree" would cache nothing costly.
- **No `React.memo` on `AccountRow`.** Measured: identical result with and
  without it (0.3 ms). An `AccountRow` re-renders only when its `CategoryRow`
  does, and that only re-renders on its own toggle, which mounts or unmounts the
  Accounts anyway. The memo on `CategoryRow` already stops every other cause, so
  a second one would be code that changes nothing.
- **No `useCallback` or `useMemo` on handlers and derived values.** None is
  passed to a memoized child, so none can make a memo hold. `onChoose` reaches
  a native `<select>`; `exportReport` reaches a `<button>`.
- **No memoization of the chooser components, the export button or the
  notice.** They are a few nodes each; the cost of comparing props is of the same
  order as re-rendering them.
- **No virtualisation (windowing).** 5,782 rows is far past what a person expands
  by hand, since a Category starts collapsed and rows are omitted, not hidden;
  the tree's cost follows what the user has opened. If a real ledger's leaf
  counts made the _expanded_ view routinely large, windowing is the next tool,
  and the row components are already the shape it needs.

## The lazy loading that is done

ExcelJS (about 930 kB, 256 kB gzipped) is imported when the user clicks Export,
so it is a separate chunk that a reader of Reports never downloads. That is a
larger saving than every render optimisation above combined, for the visitor who
does not export.

## Consequences

- A change that makes a `CategoryRow` prop unstable — building a Category or a
  handler inline, say — silently turns the memo into a no-op. The render-count
  test is what would notice, which is why it counts.
- ADR-0005's line reserving `useMemo` for "the Chart of Accounts tree
  aggregation" no longer applies; that work is in the importer.
