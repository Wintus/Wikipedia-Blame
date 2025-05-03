import { Suspense, useMemo, useState } from 'react';
import useDebounce from '../../../hooks/useDebounce';
import { fetchPageId } from '../../../services/MediaWikiAPIs';
import { PageIdFetcher } from './PageIdFetcher';

interface PageTitleInputProps {
	initialPageTitle: string;
	wikiUrl: URL;
}

export function PageTitleInput({
	initialPageTitle,
	wikiUrl,
}: PageTitleInputProps) {
	const [pageTitle, setPageTitle] = useState(initialPageTitle);
	const debouncedPageTitle = useDebounce(pageTitle.trim(), 300);

	const pageIdPromise = useMemo(async () => {
		// guard
		if (!debouncedPageTitle) {
			return {};
		}
		// fetch page ID
		try {
			const id = await fetchPageId(wikiUrl, debouncedPageTitle);
			return { id: id.toString() };
		} catch (error) {
			console.error('Error fetching page ID:', error);
			return { error: 'Error fetching page ID. Please try again.' };
		}
	}, [wikiUrl, debouncedPageTitle]);

	return (
		<div className="form-group">
			<label htmlFor="page-title">Wiki Article Title:</label>
			<input
				type="text"
				id="page-title"
				name="pageTitle"
				value={pageTitle}
				onChange={(e) => setPageTitle(e.target.value)}
				placeholder="e.g. Albert Einstein"
				required
			/>
			<Suspense
				fallback={
					<div className="status-message-container">
						<span className="loading-indicator">Checking title...</span>
					</div>
				}
			>
				<PageIdFetcher promise={pageIdPromise} />
			</Suspense>
		</div>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach, beforeAll, afterAll } =
		import.meta.vitest;
	const { render, screen, act, waitForElementToBeRemoved } = await import(
		'@testing-library/react'
	);
	const { userEvent } = await import('@testing-library/user-event');
	const MediaWikiAPIs = await import('../../../services/MediaWikiAPIs');

	describe('PageTitleInput', () => {
		const stubWikiUrl = new URL('https://en.wikipedia.org');
		const mockFetchPageId = vi.fn();

		beforeAll(() => {
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId
			);
		});

		beforeEach(() => {
			mockFetchPageId.mockReset();
		});

		afterAll(() => {
			vi.restoreAllMocks();
		});

		it('renders the label and input with initial value', async () => {
			mockFetchPageId.mockResolvedValue(123);
			await act(async () =>
				render(
					<PageTitleInput initialPageTitle="Test Title" wikiUrl={stubWikiUrl} />
				)
			);
			const inputElement = screen.getByLabelText(
				/Wiki Article Title:/i
			) as HTMLInputElement;
			expect(inputElement).toBeInTheDocument();
			expect(inputElement.value).toBe('Test Title');
		});

		it('renders a hidden input field for pageId', async () => {
			await act(async () =>
				render(<PageTitleInput initialPageTitle="" wikiUrl={stubWikiUrl} />)
			);
			expect(screen.getByTestId('pageId-input')).toBeInTheDocument();
		});

		it('updates the input value on change', async () => {
			const user = userEvent.setup();
			mockFetchPageId.mockResolvedValue(123);
			await act(async () =>
				render(
					<PageTitleInput initialPageTitle="Test Title" wikiUrl={stubWikiUrl} />
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
				render(<PageTitleInput initialPageTitle="" wikiUrl={stubWikiUrl} />)
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

			expect(mockFetchPageId).toHaveBeenCalledWith(stubWikiUrl, 'Test');
		});

		it('renders the hidden input with the correct pageId when fetch is successful', async () => {
			mockFetchPageId.mockResolvedValue(123);
			await act(async () =>
				render(
					<PageTitleInput initialPageTitle="Test Title" wikiUrl={stubWikiUrl} />
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

		it('displays error message and sets empty hidden input when fetch fails', async () => {
			mockFetchPageId.mockRejectedValue(new Error('API Error'));
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			await act(async () =>
				render(
					<PageTitleInput initialPageTitle="Test Title" wikiUrl={stubWikiUrl} />
				)
			);
			// Wait for the API call
			expect(mockFetchPageId).toHaveBeenCalledTimes(1);
			expect(screen.getByTestId('pageId-input')).toBeInTheDocument();

			const hiddenInput = screen.getByTestId(
				'pageId-input'
			) as HTMLInputElement;
			expect(hiddenInput.value).toBe('');
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error fetching page ID:',
				new Error('API Error')
			);
			const errorMessage = await screen.findByText(
				'Error fetching page ID. Please try again.',
				{},
				{
					timeout: 300,
				}
			);
			expect(errorMessage).toBeInTheDocument();
		});
	});
}
