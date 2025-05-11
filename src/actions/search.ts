import { fetchAllRevisions } from '../services/MediaWikiAPIs';
import { genFindMap } from '../utils/async-generator';
import { type SearchState } from '../state';
import { WIKI_SITES } from '../wiki';

export async function searchAction(
	prevState: SearchState,
	formData: FormData
): Promise<SearchState> {
	// Parse form data
	const wikiUrlStr = formData.get('wikiUrl')?.toString();
	const pageIdStr = formData.get('pageId')?.toString();
	const pageTitle = formData.get('pageTitle')?.toString().trim();
	const targetText = formData.get('targetText')?.toString();
	const order = formData.get('order')?.toString();
	const startRevIdStr = formData.get('startRevId')?.toString();
	const endRevIdStr = formData.get('endRevId')?.toString();

	// Validate inputs
	if (!wikiUrlStr || !URL.canParse(wikiUrlStr)) {
		return {
			...prevState,
			error: `Invalid wiki site selected: ${wikiUrlStr}`,
			searchCount: prevState.searchCount + 1,
		};
	}
	const wikiUrl = new URL(wikiUrlStr);

	if (!pageIdStr) {
		return {
			...prevState,
			wikiUrl,
			pageId: null,
			revisionId: null,
			error:
				'Page ID not found. Please wait for it to load or check the title.',
			searchCount: prevState.searchCount + 1,
		};
	}

	const pageId = Number.parseInt(pageIdStr, 10);
	if (!Number.isSafeInteger(pageId)) {
		return {
			...prevState,
			wikiUrl,
			pageId: null,
			revisionId: null,
			error: 'Invalid Page ID. Please check the title.',
			searchCount: prevState.searchCount + 1,
		};
	}

	if (!pageTitle) {
		return {
			...prevState,
			error: 'Please provide a page title to search for',
			searchCount: prevState.searchCount + 1,
		};
	}

	if (!targetText) {
		return {
			...prevState,
			error: 'Please provide a text to search for',
			searchCount: prevState.searchCount + 1,
		};
	}

	// build options for fetching revisions
	const options: {
		order?: 'asc' | 'desc';
		startRevId?: number;
		endRevId?: number;
	} = {};
	if (order === 'asc' || order === 'desc') {
		options.order = order;
	}
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
		const foundRevisionId = await genFindMap(
			(item) => (item.text.includes(targetText) ? item.rev : null),
			revisions
		);

		// Return updated search result
		return {
			wikiUrl,
			pageId,
			pageTitle,
			targetText,
			revisionId: foundRevisionId,
			order: options?.order ?? 'asc',
			error: foundRevisionId ? null : 'Text not found in any revision',
			searchCount: prevState.searchCount + 1,
		};
	} catch (error) {
		return {
			...prevState,
			wikiUrl,
			pageId,
			pageTitle,
			targetText,
			revisionId: null,
			error:
				error instanceof Error ? error.message : 'An unknown error occurred',
			searchCount: prevState.searchCount + 1,
		};
	}
}

export const initSearchState = {
	wikiUrl: WIKI_SITES[0].url,
	pageId: null,
	pageTitle: '',
	targetText: '',
	revisionId: null,
	order: 'asc',
	error: null,
	searchCount: 0,
} as const satisfies SearchState;

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach } = import.meta.vitest;

	vi.mock(import('../services/MediaWikiAPIs'), { spy: true });
	vi.mock(import('../utils/async-generator'), { spy: true });

	async function* createAsyncGenerator<T>(
		items: ReadonlyArray<T>
	): AsyncGenerator<T> {
		yield* items;
	}

	async function* createFailingAsyncGenerator(
		errorToThrow: unknown
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
			revisionId: null,
			order: 'asc',
			error: null,
			searchCount: 0,
		} as const satisfies SearchState;
		const defaultExpectedState = {
			...defaultPrevState,
			searchCount: 1,
		} as const;

		beforeEach(() => {
			vi.resetAllMocks();
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

			expect(result).toEqual({
				...defaultPrevState,
				error: expect.any(String),
				searchCount: 1,
			});
		});

		it('handles successful search flow', async () => {
			vi.mocked(fetchAllRevisions).mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue({
				rev: 2,
				text: 'Contains Test Text',
			});

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual({
				...defaultExpectedState,
				pageId: 123,
				pageTitle: 'Test Page',
				targetText: 'Test Text',
				revisionId: { rev: 2, text: 'Contains Test Text' },
				error: null,
			});
		});

		it('handles page ID not found error', async () => {
			const formData = createFormData();

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual({
				...defaultExpectedState,
				pageId: null,
				revisionId: null,
				error:
					'Page ID not found. Please wait for it to load or check the title.',
			});
		});

		it('handles text not found in revisions', async () => {
			// Mock successful revision fetch, but no text found
			vi.mocked(fetchAllRevisions).mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Another text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue(null);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual({
				...defaultExpectedState,
				pageId: 123,
				pageTitle: 'Test Page',
				targetText: 'Test Text',
				revisionId: null,
				error: 'Text not found in any revision',
			});
		});

		it('handles API exceptions gracefully', async () => {
			// Mock API throwing an exception
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createFailingAsyncGenerator(new Error('Network error'))
			);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual({
				...defaultExpectedState,
				pageId: 123,
				pageTitle: 'Test Page',
				targetText: 'Test Text',
				revisionId: null,
				error: 'Network error',
			});
		});

		it('handles non-Error exceptions', async () => {
			// Mock API throwing a non-Error object
			vi.mocked(fetchAllRevisions).mockImplementation(() =>
				createFailingAsyncGenerator('Unknown error')
			);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual({
				...defaultExpectedState,
				pageId: 123,
				pageTitle: 'Test Page',
				targetText: 'Test Text',
				revisionId: null,
				error: 'An unknown error occurred',
			});
		});

		it('calls fetchAllRevisions with endRevId when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue({
				rev: 2,
				text: 'Contains Test Text',
			});

			const formData = createFormData({ endRevId: '456', pageId: '123' });

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ endRevId: 456 }
			);
		});

		it('calls fetchAllRevisions without endRevId when not provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue({
				rev: 2,
				text: 'Contains Test Text',
			});

			const formData = createFormData({ pageId: '123' }); // No endRevId

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{} // Should be empty object
			);
		});

		it('calls fetchAllRevisions with order when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue({
				rev: 2,
				text: 'Contains Test Text',
			});

			const formData = createFormData({ order: 'desc', pageId: '123' });

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ order: 'desc' }
			);
		});

		it('returns the correct order in the search state', async () => {
			vi.mocked(fetchAllRevisions).mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue({
				rev: 2,
				text: 'Contains Test Text',
			});

			const formDataAsc = createFormData({ order: 'asc', pageId: '123' });
			const resultAsc = await searchAction(
				{ ...defaultPrevState, order: 'asc' },
				formDataAsc
			);
			expect(resultAsc.order).toBe('asc');

			const formDataDesc = createFormData({ order: 'desc', pageId: '123' });
			const resultDesc = await searchAction(
				{ ...defaultPrevState, order: 'desc' },
				formDataDesc
			);
			expect(resultDesc.order).toBe('desc');
		});

		it('calls fetchAllRevisions with startRevId when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue({
				rev: 2,
				text: 'Contains Test Text',
			});

			const formData = createFormData({ startRevId: '123', pageId: '456' });

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ startRevId: 123 }
			);
		});

		it('calls fetchAllRevisions with startRevId and endRevId when provided', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockResolvedValue(
				createAsyncGenerator([
					{ rev: 1, text: 'Some text' },
					{ rev: 2, text: 'Contains Test Text' },
					{ rev: 3, text: 'More text' },
				])
			);
			vi.mocked(genFindMap).mockResolvedValue({
				rev: 2,
				text: 'Contains Test Text',
			});

			const formData = createFormData({
				startRevId: '123',
				endRevId: '789',
				pageId: '456',
			});

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ startRevId: 123, endRevId: 789 }
			);
		});
	});
}
