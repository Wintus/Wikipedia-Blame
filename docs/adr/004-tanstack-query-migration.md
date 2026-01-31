# ADR-004: Migration to TanStack Query

## Status

Accepted

## Context

The application initially used a `useMemo` + `use()` hook pattern for fetching page IDs in `PageTitleInput.tsx`. While functional, this pattern has several issues:

1. **Anti-pattern**: React 19 documentation explicitly warns against creating promises in Client Components
2. **No request cancellation**: In-flight requests cannot be aborted when dependencies change
3. **Manual memoization**: Requires careful dependency array management
4. **Promise recreation**: Every dependency change creates a new promise
5. **No caching**: Repeated searches for the same title refetch unnecessarily
6. **Future risk**: React may tighten enforcement of this pattern in future versions

## Decision

Migrate from the `useMemo` + `use()` pattern to TanStack Query with the following architecture:

- Use `useSuspenseQuery` for data fetching (idiomatic React 19 pattern)
- Use TanStack Pacer's `useDebouncedValue` for input debouncing (300ms)
- Implement component composition pattern for conditional rendering (since `useSuspenseQuery` doesn't support `enabled` option)
- Add `AbortSignal` support to `fetchPageId` for proper request cancellation
- Set 1-hour `staleTime` for automatic caching (page IDs are immutable)

## Consequences

### Positive

- **Idiomatic React 19**: Follows official React guidance for data fetching
- **Automatic caching**: Same title returns cached response (1h staleTime, page IDs are immutable)
- **Request cancellation**: AbortSignal propagated to fetch, cancels in-flight requests
- **Promise stability**: Global query cache handles stability automatically
- **Deduplication**: Multiple components requesting same data share one request
- **DevTools**: TanStack Query DevTools available for debugging cache/queries
- **Background refetch**: Configurable stale-while-revalidate behavior

### Negative

- **Bundle size increase**: ~13.91 KB gzipped (70.74 KB → 84.65 KB)
- **Additional dependency**: Requires TanStack Query and Pacer packages
- **Increased complexity**: Requires QueryProvider setup and understanding query concepts
- **Learning curve**: Team needs to understand TanStack Query patterns

### Implementation Details

#### Component Composition Pattern

`PageTitleInput.tsx` always renders the same structure without conditional branching:

```tsx
<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary
      resetKeys={[debouncedTitle]}
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        // Error UI with retry button and hidden pageId input
      )}
    >
      <Suspense fallback={<LoadingIndicator />}>
        <PageIdFetcher wikiUrl={wikiUrl} pageTitle={debouncedTitle} />
      </Suspense>
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

The component uses `react-error-boundary` package for enhanced error handling:
- **`QueryErrorResetBoundary`**: Coordinates error boundary resets with TanStack Query cache
- **`resetKeys={[debouncedTitle]}`**: Automatically resets error boundary when title changes
- **`onReset={reset}`**: Synchronizes with TanStack Query's error state
- **404 discrimination**: Uses `isNotFoundError()` helper to distinguish 404s from other errors
- **Retry button**: Displayed only for non-404 errors with inline link styling
- **Hidden input**: Renders `<input name="pageId">` in error fallback to prevent form submission with invalid page ID

`PageIdFetcher.tsx` handles empty title in `queryFn` to avoid Rules of Hooks violations:

```tsx
const { data: pageId } = useSuspenseQuery({
  queryKey: ['pageId', wikiUrl.href, pageTitle],
  queryFn: ({ signal }) => pageTitle ? fetchPageId(wikiUrl, pageTitle, signal) : null,
});
```

When `pageTitle` is empty, the `queryFn` returns `null` immediately (no network request, no Suspense flash).

#### AbortSignal Propagation

```tsx
export async function fetchPageId(
  baseUrl: URL,
  pageTitle: string,
  signal: AbortSignal | null = null,
): Promise<number> {
  const response = await fetch(url, { signal });
  // ...
}
```

#### Query Configuration

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 60 * 1000, // 1 hour (page IDs are immutable)
      retry: 1,
    },
  },
});
```

## References

- [React 19 Documentation on use() hook](https://react.dev/reference/react/use)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [TanStack Pacer Documentation](https://tanstack.com/pacer/latest)
- [react-error-boundary Documentation](https://github.com/bvaughn/react-error-boundary)
