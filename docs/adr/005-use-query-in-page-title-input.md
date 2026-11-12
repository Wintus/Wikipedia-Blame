# ADR-005: Replace `useSuspenseQuery` with `useQuery` in `PageTitleInput`

## Status

Accepted

## Context

ADR-004 introduced `useSuspenseQuery` for the page ID fetch. Because Suspense suspends the component that calls it, the fetch had to live in a child component (`PageIdFetcher`) below a `<Suspense>` boundary, and error handling required `QueryErrorResetBoundary` > `ErrorBoundary` > `Suspense` around it.

That machinery was disproportionate for a single fetch returning one number, and it carried follow-on costs:

- `isNotFoundError` was duplicated with divergent signatures (`Error` vs `unknown`)
- Retry policy lived in `PageIdFetcher`, error UI lived in `PageTitleInput`
- Four wrapper layers for a single query
- A 29-line file with exactly one consumer, kept alive only to satisfy Suspense

## Decision

Use `useQuery` directly in `PageTitleInput`:

- Query key `['pageId', wikiUrl.href, debouncedTitle]`
- `queryFn` returns `null` for an empty title, so no request is made
- `retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1`, so 404s are never retried
- Show "Checking title..." while `isLoading`; show the error message when `isError`, with a "Try again" button that calls `refetch()` for non-404 errors
- Always render the hidden `pageId` input (`value={pageId ?? ''}`), so a form cannot submit a stale or missing ID
- Delete `PageIdFetcher.tsx` and the Suspense/error-boundary wrappers, and remove the `react-error-boundary` dependency
- Move `isNotFoundError` next to `fetchPageId` in `services/MediaWikiAPIs.ts`, which is where the error cause is created

User-visible behaviour is unchanged: one automatic retry for non-404 failures, no retry for 404s, the same loading and error copy, and the same request cancellation through the `AbortSignal`.

## Consequences

### Positive

- One file, one component, one query
- A single definition of `isNotFoundError`, co-located with the throw that creates it
- `react-error-boundary` is no longer a dependency
- Error handling and retry policy are visible at the call site

### Negative

- Loading and error handling are imperative (`isLoading` / `isError`) instead of declarative Suspense
- Tests must await query state instead of relying on Suspense throwing a promise

### Considered alternatives

- **Keep `useSuspenseQuery` and the child component** (status quo): rejected as disproportionate for one fetch
- **Use `isFetching` for the indicator and rely on the global `retry: 1`**: rejected because 404s would be retried once and the "Page not found." message would be delayed by exponential backoff. Recorded as a possible future simplification.

## References

- [ADR-004: Migration to TanStack Query](004-tanstack-query-migration.md)
- [TanStack Query: Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- Issue #161
