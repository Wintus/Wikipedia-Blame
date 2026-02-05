import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchPageId } from '../services/MediaWikiAPIs';

interface Props {
	wikiUrl: URL;
	pageTitle: string;
}

const isNotFoundError = (error: Error): boolean =>
	error.cause instanceof Response && error.cause.status === 404;

export function PageIdFetcher({ wikiUrl, pageTitle }: Props) {
	const { data: pageId } = useSuspenseQuery({
		queryKey: ['pageId', wikiUrl.href, pageTitle],
		queryFn: ({ signal }) =>
			pageTitle ? fetchPageId(wikiUrl, pageTitle, signal) : null,
		// Don't retry 404s
		retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
	});

	return (
		<input
			type="hidden"
			name="pageId"
			value={pageId ?? ''}
			data-testid="pageId-input"
		/>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach } = import.meta.vitest;
	const { render, act, screen } = await import('@testing-library/react');
	const { QueryClient, QueryClientProvider } =
		await import('@tanstack/react-query');
	const MediaWikiAPIs = await import('../services/MediaWikiAPIs');
	type QueryClientType = InstanceType<typeof QueryClient>;

	describe('PageIdFetcher', () => {
		let queryClient: QueryClientType;
		const mockFetchPageId = vi.fn();
		const testWikiUrl = new URL('https://en.wikipedia.org');

		beforeEach(() => {
			queryClient = new QueryClient({
				defaultOptions: {
					queries: { retry: false },
				},
			});
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId
			);
		});

		const renderWithQuery = (component: React.ReactElement) => {
			return render(
				<QueryClientProvider client={queryClient}>
					{component}
				</QueryClientProvider>
			);
		};

		it('passes correct arguments to fetchPageId', async () => {
			mockFetchPageId.mockResolvedValue(99999);
			await act(async () =>
				renderWithQuery(
					<PageIdFetcher wikiUrl={testWikiUrl} pageTitle="Albert Einstein" />
				)
			);
			expect(mockFetchPageId).toHaveBeenCalledWith(
				testWikiUrl,
				'Albert Einstein',
				expect.any(Object)
			);
		});

		it('renders page ID when fetch succeeds', async () => {
			mockFetchPageId.mockResolvedValue(12345);
			await act(async () =>
				renderWithQuery(
					<PageIdFetcher wikiUrl={testWikiUrl} pageTitle="Test Page" />
				)
			);
			expect(screen.getByTestId('pageId-input')).toHaveValue('12345');
		});

		it('throws error when fetch fails', async () => {
			mockFetchPageId.mockRejectedValue(new Error('Network error'));
			try {
				await act(async () =>
					renderWithQuery(
						<PageIdFetcher wikiUrl={testWikiUrl} pageTitle="Invalid" />
					)
				);
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(Error);
			}
		});

		it('renders empty hidden input when pageTitle is empty', async () => {
			mockFetchPageId.mockClear();
			await act(async () =>
				renderWithQuery(<PageIdFetcher wikiUrl={testWikiUrl} pageTitle="" />)
			);
			expect(screen.getByTestId('pageId-input')).toHaveValue('');
			expect(mockFetchPageId).not.toHaveBeenCalled();
		});
	});
}
