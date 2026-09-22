# TanStack Query owns server state

All server data is fetched through TanStack Query rather than `useEffect`.
Fetching is a cache-coherency problem — deduplication, staleness, retries, race
conditions when parameters change faster than responses return — and `useEffect`
is a lifecycle primitive, not a cache.

## Considered Options

- **RTK Query** — rejected: it ships inside Redux Toolkit, so adopting it means
  adopting the store and slices. This app has almost no client state, so that is
  importing a state-management library in order to obtain a data-fetching one.
- **SWR** — viable, but a weaker mutation story and less granular cache
  invalidation, at no saving worth the ceiling.
- **`useEffect` + `useState`** — rejected per the reasoning above.

## Consequences

- Request deduplication and caching are the first-order performance win; `useMemo`
  is then reserved for the Chart of Accounts tree aggregation, where the CPU cost
  is real, rather than applied by reflex.

_Updated by [ADR-0008](./0008-memoization-strategy.md): the tree aggregation moved to the importer (ADR-0006), so `useMemo` has no aggregation to guard, and the memoization that was done is recorded there._
