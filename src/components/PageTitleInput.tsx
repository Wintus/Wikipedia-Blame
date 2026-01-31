import { Suspense, useState } from 'react';
import { useDebouncedValue } from '@tanstack/react-pacer';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { PageIdFetcher } from './PageIdFetcher';

interface PageTitleInputProps {
	initialPageTitle: string;
	wikiUrl: URL;
}

const isNotFoundError = (error: unknown): boolean =>
	error instanceof Error &&
	error.cause instanceof Response &&
	error.cause.status === 404;

export function PageTitleInput({
	initialPageTitle,
	wikiUrl,
}: PageTitleInputProps) {
	const [pageTitle, setPageTitle] = useState(initialPageTitle);
	const [debouncedTitle] = useDebouncedValue(pageTitle.trim(), { wait: 300 });

	return (
		<div className="form-group">
			<label htmlFor="page-title">Wiki Article Title:</label>
			<input
				type="search"
				id="page-title"
				name="pageTitle"
				value={pageTitle}
				onChange={(e) => setPageTitle(e.target.value)}
				placeholder="e.g. Albert Einstein"
				required
			/>

			<QueryErrorResetBoundary>
				{({ reset }) => (
					<ErrorBoundary
						resetKeys={[debouncedTitle]}
						onReset={reset}
						fallbackRender={({ error, resetErrorBoundary }) => (
							<>
								<div className="status-message-container">
									<span className="error-message">
										{isNotFoundError(error) ? (
											'Page not found.'
										) : (
											<>
												Error fetching page ID.{' '}
												<button type="button" onClick={resetErrorBoundary}>
													Try again
												</button>
											</>
										)}
									</span>
								</div>
								<input
									type="hidden"
									name="pageId"
									value=""
									data-testid="pageId-input"
								/>
							</>
						)}
					>
						<Suspense
							fallback={
								<div className="status-message-container">
									<span className="loading-indicator">Checking title...</span>
								</div>
							}
						>
							<PageIdFetcher wikiUrl={wikiUrl} pageTitle={debouncedTitle} />
						</Suspense>
					</ErrorBoundary>
				)}
			</QueryErrorResetBoundary>
		</div>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach, afterAll } = import.meta.vitest;
	const { render, screen, act, waitForElementToBeRemoved } =
		await import('@testing-library/react');
	const { userEvent } = await import('@testing-library/user-event');
	const { QueryClient, QueryClientProvider } =
		await import('@tanstack/react-query');
	const MediaWikiAPIs = await import('../services/MediaWikiAPIs');
	type QueryClientType = InstanceType<typeof QueryClient>;

	describe('PageTitleInput', () => {
		const stubWikiUrl = new URL('https://en.wikipedia.org');
		const mockFetchPageId = vi.fn();
		let queryClient: QueryClientType;

		beforeEach(() => {
			queryClient = new QueryClient({
				defaultOptions: {
					queries: { retry: false, retryDelay: 0 },
				},
			});
			mockFetchPageId.mockReset();
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId
			);
		});

		afterAll(() => {
			vi.restoreAllMocks();
		});

		const renderWithQuery = (component: React.ReactElement) => {
			return render(
				<QueryClientProvider client={queryClient}>
					{component}
				</QueryClientProvider>
			);
		};

		describe('Rendering', () => {
			it('renders the label and input with initial value', async () => {
				mockFetchPageId.mockResolvedValue(123);
				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);
				const inputElement = screen.getByLabelText(
					/Wiki Article Title:/i
				) as HTMLInputElement;
				expect(inputElement).toBeInTheDocument();
				expect(inputElement.value).toBe('Test Title');
			});

			it('renders a hidden input field for pageId when title is empty', async () => {
				await act(async () =>
					renderWithQuery(
						<PageTitleInput initialPageTitle="" wikiUrl={stubWikiUrl} />
					)
				);
				expect(screen.getByTestId('pageId-input')).toBeInTheDocument();
				const hiddenInput = screen.getByTestId(
					'pageId-input'
				) as HTMLInputElement;
				expect(hiddenInput.value).toBe('');
			});
		});

		describe('User Interaction', () => {
			it('updates the input value on change', async () => {
				const user = userEvent.setup();
				mockFetchPageId.mockResolvedValue(123);
				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);
				const inputElement = screen.getByLabelText(
					/Wiki Article Title:/i
				) as HTMLInputElement;

				// Wait for the debounce and API call
				expect(mockFetchPageId).toHaveBeenCalledTimes(1);

				await user.clear(inputElement);
				await user.type(inputElement, 'New Title');

				const loadingIndicator = await screen.findByText(
					'Checking title...',
					{},
					{
						timeout: 350,
					}
				);
				expect(loadingIndicator).toBeInTheDocument();

				// Wait for the debounce and API call
				expect(mockFetchPageId).toHaveBeenCalledTimes(2);
				await waitForElementToBeRemoved(() =>
					screen.getByText('Checking title...')
				);

				expect(inputElement.value).toBe('New Title');
			});

			it('calls fetchPageId with the correct arguments after debouncing', async () => {
				const user = userEvent.setup();
				mockFetchPageId.mockResolvedValue(123);
				await act(async () =>
					renderWithQuery(
						<PageTitleInput initialPageTitle="" wikiUrl={stubWikiUrl} />
					)
				);
				const inputElement = screen.getByLabelText(
					/Wiki Article Title:/i
				) as HTMLInputElement;

				await user.clear(inputElement);
				await user.type(inputElement, 'Test');

				const loadingIndicator = await screen.findByText(
					'Checking title...',
					{},
					{
						timeout: 350,
					}
				);
				expect(loadingIndicator).toBeInTheDocument();

				// Wait for the debounce and API call
				expect(mockFetchPageId).toHaveBeenCalledTimes(1);
				await waitForElementToBeRemoved(() =>
					screen.getByText('Checking title...')
				);

				expect(mockFetchPageId).toHaveBeenCalledWith(
					stubWikiUrl,
					'Test',
					expect.any(Object)
				);
			});
		});

		describe('API Response Handling', () => {
			it('renders the hidden input with the correct pageId when fetch is successful', async () => {
				mockFetchPageId.mockResolvedValue(123);
				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);
				// Wait for the API call
				expect(mockFetchPageId).toHaveBeenCalledTimes(1);
				expect(screen.getByTestId('pageId-input')).toBeInTheDocument();
				const hiddenInput = screen.getByTestId(
					'pageId-input'
				) as HTMLInputElement;
				expect(hiddenInput.value).toBe('123');
			});

			it('displays 404 error message without retry button', async () => {
				const mockResponse = new Response('Not Found', { status: 404 });
				mockFetchPageId.mockRejectedValue(
					new Error('Failed to fetch page ID', { cause: mockResponse })
				);
				const consoleErrorSpy = vi
					.spyOn(console, 'error')
					.mockImplementation(() => {});

				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);

				const errorMessage = await screen.findByText('Page not found.');
				expect(errorMessage).toBeInTheDocument();

				// Should NOT have a retry button for 404
				expect(
					screen.queryByRole('button', { name: /try again/i })
				).not.toBeInTheDocument();

				const hiddenInput = screen.getByTestId(
					'pageId-input'
				) as HTMLInputElement;
				expect(hiddenInput.value).toBe('');
				consoleErrorSpy.mockRestore();
			});

			it('displays error message with retry button for network errors', async () => {
				mockFetchPageId.mockRejectedValue(new Error('Network error'));
				const consoleErrorSpy = vi
					.spyOn(console, 'error')
					.mockImplementation(() => {});

				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);

				const errorMessage = await screen.findByText(
					/Error fetching page ID\./
				);
				expect(errorMessage).toBeInTheDocument();

				// Should have a retry button for network errors
				const retryButton = screen.getByRole('button', { name: /try again/i });
				expect(retryButton).toBeInTheDocument();
				expect(retryButton).toHaveAttribute('type', 'button');

				const hiddenInput = screen.getByTestId(
					'pageId-input'
				) as HTMLInputElement;
				expect(hiddenInput.value).toBe('');
				consoleErrorSpy.mockRestore();
			});

			it('displays error message with retry button for 5XX server errors', async () => {
				const mockResponse = new Response('Server Error', { status: 500 });
				mockFetchPageId.mockRejectedValue(
					new Error('Failed to fetch page ID', { cause: mockResponse })
				);
				const consoleErrorSpy = vi
					.spyOn(console, 'error')
					.mockImplementation(() => {});

				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);

				const errorMessage = await screen.findByText(
					/Error fetching page ID\./
				);
				expect(errorMessage).toBeInTheDocument();

				// Should have a retry button for 5XX errors
				const retryButton = screen.getByRole('button', { name: /try again/i });
				expect(retryButton).toBeInTheDocument();

				const hiddenInput = screen.getByTestId(
					'pageId-input'
				) as HTMLInputElement;
				expect(hiddenInput.value).toBe('');
				consoleErrorSpy.mockRestore();
			});

			it('clicking retry button re-fetches page ID successfully', async () => {
				const user = userEvent.setup();
				// First call fails, query-level retry fails again, then manual retry succeeds
				mockFetchPageId
					.mockRejectedValueOnce(new Error('Network error'))
					.mockRejectedValueOnce(new Error('Network error'))
					.mockResolvedValueOnce(456);

				const consoleErrorSpy = vi
					.spyOn(console, 'error')
					.mockImplementation(() => {});

				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);

				// Wait for error state
				const retryButton = await screen.findByRole('button', {
					name: /try again/i,
				});
				expect(retryButton).toBeInTheDocument();
				expect(mockFetchPageId).toHaveBeenCalledTimes(2);

				// Click retry
				await user.click(retryButton);

				// Should show loading state
				const loadingIndicator = await screen.findByText('Checking title...');
				expect(loadingIndicator).toBeInTheDocument();

				// Wait for success state
				await waitForElementToBeRemoved(() =>
					screen.getByText('Checking title...')
				);

				expect(mockFetchPageId).toHaveBeenCalledTimes(3);
				const hiddenInput = screen.getByTestId(
					'pageId-input'
				) as HTMLInputElement;
				expect(hiddenInput.value).toBe('456');
				consoleErrorSpy.mockRestore();
			});

			it('recovers from error when typing a different title', async () => {
				const user = userEvent.setup();
				// First call fails for "Test Title", query-level retry fails again, then typing new title succeeds
				mockFetchPageId
					.mockRejectedValueOnce(new Error('Network error'))
					.mockRejectedValueOnce(new Error('Network error'))
					.mockResolvedValueOnce(789);

				const consoleErrorSpy = vi
					.spyOn(console, 'error')
					.mockImplementation(() => {});

				await act(async () =>
					renderWithQuery(
						<PageTitleInput
							initialPageTitle="Test Title"
							wikiUrl={stubWikiUrl}
						/>
					)
				);

				// Wait for error state
				const errorMessage = await screen.findByText(
					/Error fetching page ID\./
				);
				expect(errorMessage).toBeInTheDocument();
				expect(mockFetchPageId).toHaveBeenCalledTimes(2);

				// Change the title
				const inputElement = screen.getByLabelText(/Wiki Article Title:/i);
				await user.clear(inputElement);
				await user.type(inputElement, 'New Title');

				// Should show loading state
				const loadingIndicator = await screen.findByText(
					'Checking title...',
					{},
					{ timeout: 350 }
				);
				expect(loadingIndicator).toBeInTheDocument();

				// Wait for success state
				await waitForElementToBeRemoved(
					() => screen.getByText('Checking title...'),
					{ timeout: 1000 }
				);

				expect(mockFetchPageId).toHaveBeenCalledTimes(3);
				const hiddenInput = screen.getByTestId(
					'pageId-input'
				) as HTMLInputElement;
				expect(hiddenInput.value).toBe('789');
				consoleErrorSpy.mockRestore();
			});
		});

		describe('Debounce Behavior', () => {
			it('does not trigger fetch when debounced value has not changed', async () => {
				const user = userEvent.setup();
				mockFetchPageId.mockResolvedValue(123);

				await act(async () =>
					renderWithQuery(
						<PageTitleInput initialPageTitle="Test" wikiUrl={stubWikiUrl} />
					)
				);

				// Initial render should trigger one call for "Test"
				expect(mockFetchPageId).toHaveBeenCalledTimes(1);

				const inputElement = screen.getByLabelText(/Wiki Article Title:/i);

				// Type a character - this triggers setPageTitle and a re-render,
				// but debouncedTitle hasn't changed yet (debounce delay is 300ms)
				await user.type(inputElement, 's');

				// Immediately after typing (before debounce completes), fetchPageId
				// should NOT be called again because debouncedTitle is still "Test"
				expect(mockFetchPageId).toHaveBeenCalledTimes(1);
			});
		});
	});
}
