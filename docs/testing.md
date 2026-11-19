# Testing

Tests live in the same file as the code they cover, inside an
`if (import.meta.vitest)` block. See the
[Vitest in-source testing guide](https://vitest.dev/guide/in-source).

## Rules

1. Every source file carries a test block; new files need one.
2. Write the failing test first, then the implementation.
3. Import test-only dependencies with `await import(...)` inside the block so
   they never reach the production bundle.
4. Start the block with `// MARK: in-source tests`; editors use it as a
   navigation marker.
5. Pin the contract on the assertion side, e.g.
   `expect(result).toEqual<SearchState>({ ... })`. A generic mock checks
   nothing, so the explicit type argument is what keeps the shape honest.
6. `npm test` runs once, `npm run test:watch` gives feedback while editing and
   `npm run test:coverage` reports coverage.

## Components that read query data

Wrap the component in a fresh `QueryClientProvider` for every test and turn
retries off. When a request has to stay pending, control it with a deferred
promise instead of timers.

```tsx
// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, beforeEach } = import.meta.vitest;
	const { render, screen, act } = await import('@testing-library/react');
	const { QueryClient, QueryClientProvider } =
		await import('@tanstack/react-query');

	describe('PageTitleInput', () => {
		const wikiUrl = new URL('https://en.wikipedia.org');
		let queryClient: InstanceType<typeof QueryClient>;

		beforeEach(() => {
			queryClient = new QueryClient({
				defaultOptions: { queries: { retry: false, retryDelay: 0 } },
			});
		});

		const renderWithQuery = (ui: React.ReactElement) =>
			render(
				<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
			);

		it('always renders the hidden pageId input', async () => {
			await act(async () =>
				renderWithQuery(<PageTitleInput wikiUrl={wikiUrl} />),
			);
			expect(screen.getByTestId('pageId-input')).toBeInTheDocument();
		});
	});
}
```

## Pure functions and generators

No provider is involved. Build the input inside the test and assert the value
the caller receives.

```ts
// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	async function* from<T>(items: ReadonlyArray<T>): AsyncGenerator<T> {
		yield* items;
	}

	describe('findMap', () => {
		it('returns the first matching revision', async () => {
			const revisions = [
				{ rev: 1, text: 'Some text' },
				{ rev: 2, text: 'Contains the target' },
			];
			const result = await findMap(
				(item) => (item.text.includes('target') ? item.rev : null),
				from(revisions),
			);
			expect(result).toBe(2);
		});
	});
}
```
