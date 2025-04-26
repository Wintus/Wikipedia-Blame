import {
	fetchAllRevisions,
	fetchRevisionTexts,
	type RevisionResult,
} from '../services/MediaWikiAPIs';
import { findOneOccurrence } from '../utils/item-finder';
import { type WikiSite, type SearchState, WIKI_SITES } from '../wiki';

export async function searchAction(
	prevState: SearchState,
	formData: FormData
): Promise<SearchState> {
	// Parse form data
	const wikiId = formData.get('wikiId')?.toString().toUpperCase();
	const pageIdStr = formData.get('pageId')?.toString();
	const pageTitle = formData.get('pageTitle')?.toString().trim();
	const targetText = formData.get('targetText')?.toString();
	const order = formData.get('order')?.toString();
	const uptoRevIdStr = formData.get('uptoRevId')?.toString();

	// Validate inputs
	if (
		!wikiId ||
		!((key: string): key is keyof typeof WIKI_SITES => key in WIKI_SITES)(
			wikiId
		)
	) {
		return {
			...prevState,
			error: `Invalid wiki site selected: ${wikiId}`,
			searchCount: prevState.searchCount + 1,
		};
	}
	const wiki = WIKI_SITES[wikiId] satisfies WikiSite;
	const baseUrl = wiki.url;

	if (!pageIdStr) {
		return {
			...prevState,
			wiki,
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
			wiki,
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
	const options: { uptoRevId?: number; order?: 'asc' | 'desc' } = {};
	if (order === 'asc' || order === 'desc') {
		options.order = order;
	}
	const uptoRevId = uptoRevIdStr ? Number.parseInt(uptoRevIdStr, 10) : NaN;
	if (Number.isSafeInteger(uptoRevId)) {
		options.uptoRevId = uptoRevId;
	}

	try {
		// Fetch all revisions
		const revisions = fetchAllRevisions(baseUrl, pageId, options);

		// Find occurrence of target text
		const foundRevisionId = await findOneOccurrence(
			(item: RevisionResult): number | null =>
				item.text.includes(targetText) ? item.rev : null,
			(revIds) => fetchRevisionTexts(baseUrl, revIds),
			revisions
		);

		// Return updated search result
		return {
			wiki,
			pageId,
			pageTitle,
			targetText,
			revisionId: foundRevisionId,
			order: order === 'asc' || order === 'desc' ? order : 'asc',
			error: foundRevisionId ? null : 'Text not found in any revision',
			searchCount: prevState.searchCount + 1,
		};
	} catch (error) {
		return {
			...prevState,
			wiki,
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

export const defaultSearchResult = {
	wiki: WIKI_SITES.ENWP,
	pageId: null,
	pageTitle: '',
	targetText: '',
	revisionId: null,
	order: 'asc',
	error: null,
	searchCount: 0,
} as const satisfies SearchState;

if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach } = import.meta.vitest;

	vi.mock(import('../services/MediaWikiAPIs'), { spy: true });
	vi.mock(import('../utils/item-finder'), { spy: true });

	async function* createAsyncGenerator<T>(
		items: ReadonlyArray<T>
	): AsyncGenerator<T> {
		for (const item of items) {
			yield item;
		}
	}

	async function* createFailingAsyncGenerator(
		errorToThrow: unknown
	): AsyncGenerator<never> {
		// Yield nothing, just throw immediately
		yield* []; // Ensures it's a valid generator
		throw errorToThrow;
	}

	describe('searchAction', () => {
		const defaultWiki = WIKI_SITES.ENWP;
		const defaultPrevState = {
			wiki: defaultWiki,
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
			formData.append('wikiId', defaultWiki.id);
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
			// Mock API calls
			vi.mocked(fetchAllRevisions).mockResolvedValue(
				createAsyncGenerator([1, 2, 3])
			);
			vi.mocked(fetchRevisionTexts).mockResolvedValue(
				createAsyncGenerator([{ rev: 2, text: 'Contains Test Text' }])
			);
			vi.mocked(findOneOccurrence).mockResolvedValue(2);

			const formData = createFormData({ pageId: '123' });

			const result = await searchAction(defaultPrevState, formData);

			expect(result).toEqual({
				...defaultExpectedState,
				pageId: 123,
				pageTitle: 'Test Page',
				targetText: 'Test Text',
				revisionId: 2,
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
				createAsyncGenerator([1, 2, 3])
			);
			vi.mocked(findOneOccurrence).mockResolvedValue(null);

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
			vi.mocked(fetchRevisionTexts).mockImplementation(() =>
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

		it('calls fetchAllRevisions with uptoRevId when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockResolvedValue(
				createAsyncGenerator([1, 2, 3])
			);
			vi.mocked(findOneOccurrence).mockResolvedValue(2);
			vi.mocked(fetchRevisionTexts).mockResolvedValue(
				createAsyncGenerator([{ rev: 2, text: 'Contains Test Text' }])
			);

			const formData = createFormData({ uptoRevId: '456', pageId: '123' });

			await searchAction(defaultPrevState, formData);

			expect(mockedFetchAllRevisions).toHaveBeenCalledWith(
				expect.anything(), // baseUrl
				expect.anything(), // pageId
				{ uptoRevId: 456 }
			);
		});

		it('calls fetchAllRevisions without uptoRevId when provided in form data', async () => {
			const mockedFetchAllRevisions = vi.mocked(fetchAllRevisions);
			mockedFetchAllRevisions.mockResolvedValue(
				createAsyncGenerator([1, 2, 3])
			);
			vi.mocked(fetchRevisionTexts).mockResolvedValue(
				createAsyncGenerator([{ rev: 2, text: 'Contains Test Text' }])
			);
			vi.mocked(findOneOccurrence).mockResolvedValue(2);

			const formData = createFormData({ pageId: '123' }); // No uptoRevId

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
				createAsyncGenerator([1, 2, 3])
			);
			vi.mocked(fetchRevisionTexts).mockResolvedValue(
				createAsyncGenerator([{ rev: 2, text: 'Contains Test Text' }])
			);
			vi.mocked(findOneOccurrence).mockResolvedValue(2);

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
				createAsyncGenerator([1, 2, 3])
			);
			vi.mocked(fetchRevisionTexts).mockResolvedValue(
				createAsyncGenerator([{ rev: 2, text: 'Contains Test Text' }])
			);
			vi.mocked(findOneOccurrence).mockResolvedValue(2);

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
	});
}
