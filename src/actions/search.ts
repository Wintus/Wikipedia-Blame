import { fetchAllRevisions } from '../services/MediaWikiAPIs';
import { findMap } from '../lib/async-generator';
import { type SearchOutcomeState, type SearchState } from '../state';
import { WIKI_SITES } from '../wiki';

export async function searchAction(
	prevState: SearchState,
	formData: FormData,
): Promise<SearchOutcomeState> {
	// Parse form data
	const wikiUrlStr = formData.get('wikiUrl')?.toString();
	const pageIdStr = formData.get('pageId')?.toString();
	const pageTitle = formData.get('pageTitle')?.toString().trim() ?? '';
	const targetText = formData.get('targetText')?.toString() ?? '';
	const orderStr = formData.get('order')?.toString();
	const startRevIdStr = formData.get('startRevId')?.toString();
	const endRevIdStr = formData.get('endRevId')?.toString();

	const submittedWikiUrl =
		wikiUrlStr && URL.canParse(wikiUrlStr) ? new URL(wikiUrlStr) : null;
	const wikiUrl = submittedWikiUrl ?? prevState.wikiUrl;
	const submittedPageId = pageIdStr ? Number.parseInt(pageIdStr, 10) : NaN;
	const pageId = Number.isSafeInteger(submittedPageId) ? submittedPageId : null;
	const order =
		orderStr === 'asc' || orderStr === 'desc' ? orderStr : prevState.order;
	const query = {
		wikiUrl,
		pageId,
		pageTitle,
		targetText,
		order,
	};

	// Validate inputs
	if (submittedWikiUrl == null) {
		return {
			...query,
			status: 'error',
			message: `Invalid wiki site selected: ${wikiUrlStr}`,
		};
	}

	if (!pageIdStr) {
		return {
			...query,
			status: 'error',
			message:
				'Page ID not found. Please wait for it to load or check the title.',
		};
	}

	if (pageId == null) {
		return {
			...query,
			status: 'error',
			message: 'Invalid Page ID. Please check the title.',
		};
	}

	if (!pageTitle) {
		return {
			...query,
			status: 'error',
			message: 'Please provide a page title to search for',
		};
	}

	if (!targetText) {
		return {
			...query,
			status: 'error',
			message: 'Please provide a text to search for',
		};
	}

	// build options for fetching revisions
	const options: {
		order: 'asc' | 'desc';
		startRevId?: number;
		endRevId?: number;
	} = { order };
	const startRevId = startRevIdStr ? Number.parseInt(startRevIdStr, 10) : NaN;
	if (Number.isSafeInteger(startRevId)) {
		options.startRevId = startRevId;
	}
	const endRevId = endRevIdStr ? Number.parseInt(endRevIdStr, 10) : NaN;
	if (Number.isSafeInteger(endRevId)) {
		options.endRevId = endRevId;
	}

	try {
		// Fetch all revisions
		const revisions = fetchAllRevisions(wikiUrl, pageId, options);

		// Find occurrence of target text
		const foundRevisionId = await findMap(
			(item) => (item.text.includes(targetText) ? item.rev : null),
			revisions,
		);

		return foundRevisionId == null
			? { ...query, status: 'not-found' }
			: { ...query, status: 'found', revisionId: foundRevisionId };
	} catch (error) {
		console.error('Search failed:', error);
		return {
			...query,
			status: 'error',
			message:
				error instanceof Error ? error.message : 'An unknown error occurred',
		};
	}
}

export const initSearchState = {
	wikiUrl: WIKI_SITES[0].url,
	pageId: null,
	pageTitle: '',
	targetText: '',
	order: 'asc',
	status: 'initial',
} as const satisfies SearchState;

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach, afterAll } = import.meta.vitest;

	vi.mock(import('../services/MediaWikiAPIs'), { spy: true });

	const consoleErrorSpy = vi
		.spyOn(console, 'error')
		.mockImplementation(() => {});

	async function* createAsyncGenerator<T>(
		items: ReadonlyArray<T>,
	): AsyncGenerator<T> {
		yield* items;
	}

	async function* createFailingAsyncGenerator(
		errorToThrow: unknown,
	): AsyncGenerator<never> {
		// Yield nothing, just throw immediately
		yield* []; // Ensures it's a valid generator
		throw errorToThrow;
	}

	describe('searchAction', () => {
		const defaultPrevState = {
			wikiUrl: new URL('https://en.wikipedia.org'),
			pageId: null,
			pageTitle: '',
			targetText: '',
			order: 'asc',
			status: 'initial',
		} as const satisfies SearchState;
		const submittedQuery = {
			wikiUrl: new URL('https://en.wikipedia.org/'),
			pageId: 123,
			pageTitle: 'Test Page',
			targetText: 'Test Text',
			order: 'asc',
		} as const;

		beforeEach(() => {
			vi.resetAllMocks();
			consoleErrorSpy.mockImplementation(() => {});
		});

		afterAll(() => {
			consoleErrorSpy.mockRestore();
		});

		const createFormData = (overrides: Record<string, string> = {}) => {
			const formData = new FormData();
			formData.append('wikiUrl', 'https://en.wikipedia.org/');
			formData.append('pageTitle', 'Test Page');
			formData.append('targetText', 'Test Text');

			Object.entries(overrides).forEach(([key, value]) => {
				formData.set(key, value);
			});

			return formData;
		};

		it('validates required inputs and returns error for missing fields', async () => {
			const emptyFormData = new FormData();

			const result = await searchAction(defaultPrevState, emptyFormData);

			expect(result).toEqual<SearchOutcomeState>({
				...defaultPrevState,
				status: 'error',
				message: expect.any(String),
			});
		});

		it('handles successful search flow', async () => {
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				status: 'found',
				revisionId: 2,
			});
		});

		it('handles page ID not found error', async () => {
			const formData = createFormData();

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				pageId: null,
				status: 'error',
				message:
					'Page ID not found. Please wait for it to load or check the title.',
			});
		});

		it('falls back to the previous wiki URL when the submitted URL is invalid', async () => {
			const formData = createFormData({
				wikiUrl: 'not a url',
				pageId: '123',
			});

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				wikiUrl: defaultPrevState.wikiUrl,
				status: 'error',
				message: 'Invalid wiki site selected: not a url',
			});
		});

		it('clears the page ID when the submitted page ID is invalid', async () => {
			const formData = createFormData({ pageId: 'not-a-number' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				pageId: null,
				status: 'error',
				message: 'Invalid Page ID. Please check the title.',
			});
		});

		it('keeps an empty page title from the submission', async () => {
			const formData = createFormData({ pageId: '123', pageTitle: '' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				pageTitle: '',
				status: 'error',
				message: 'Please provide a page title to search for',
			});
		});

		it('keeps an empty target text from the submission', async () => {
			const formData = createFormData({ pageId: '123', targetText: '' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				targetText: '',
				status: 'error',
				message: 'Please provide a text to search for',
			});
		});

		it('uses the previous order for both the state and the fetch when the submitted order is invalid', async () => {
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
				]),
			);
			const formData = createFormData({
				pageId: '123',
				order: 'sideways',
			});

			const result = await searchAction(
				{ ...defaultPrevState, order: 'desc' },
				formData,
			);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				order: 'desc',
				status: 'found',
				revisionId: 2,
			});
			expect(vi.mocked(fetchAllRevisions)).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				{ order: 'desc' },
			);
		});

		it('handles text not found in revisions', async () => {
			// Mock successful revision fetch, but no text found
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Another text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				status: 'not-found',
			});
		});

		it('handles API exceptions gracefully', async () => {
			// Mock API throwing an exception
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createFailingAsyncGenerator(new Error('Network error')),
			);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				status: 'error',
				message: 'Network error',
			});
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Search failed:',
				expect.any(Error),
			);
		});

		it('handles non-Error exceptions', async () => {
			// Mock API throwing a non-Error object
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createFailingAsyncGenerator('Unknown error'),
			);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual<SearchOutcomeState>({
				...submittedQuery,
				status: 'error',
				message: 'An unknown error occurred',
			});
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Search failed:',
				'Unknown error',
			);
		});

		it('calls fetchAllRevisions with endRevId when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formData = createFormData({ endRevId: '456', pageId: '123' });

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ order: 'asc', endRevId: 456 },
			);
		});

		it('calls fetchAllRevisions without endRevId when not provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formData = createFormData({ pageId: '123' }); // No endRevId

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ order: 'asc' }, // No endRevId
			);
		});

		it('calls fetchAllRevisions with order when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formData = createFormData({ order: 'desc', pageId: '123' });

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ order: 'desc' },
			);
		});

		it('returns the correct order in the search state', async () => {
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formDataAsc = createFormData({ order: 'asc', pageId: '123' });
			const resultAsc = await searchAction(
				{ ...defaultPrevState, order: 'asc' },
				formDataAsc,
			);
			expect(resultAsc.order).toBe('asc');

			const formDataDesc = createFormData({ order: 'desc', pageId: '123' });
			const resultDesc = await searchAction(
				{ ...defaultPrevState, order: 'desc' },
				formDataDesc,
			);
			expect(resultDesc.order).toBe('desc');
		});

		it('calls fetchAllRevisions with startRevId when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formData = createFormData({ startRevId: '123', pageId: '456' });

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ order: 'asc', startRevId: 123 },
			);
		});

		it('calls fetchAllRevisions with startRevId and endRevId when provided', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockImplementation(() =>
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				]),
			);

			const formData = createFormData({
				startRevId: '123',
				endRevId: '789',
				pageId: '456',
			});

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ order: 'asc', startRevId: 123, endRevId: 789 },
			);
		});
	});
}
