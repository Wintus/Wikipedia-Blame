import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAction } from '../search';
import { WIKI_SITES, type SearchState } from '../../wiki';
import * as MediaWikiAPIs from '../../services/MediaWikiAPIs';
import * as ItemFinder from '../../utils/item-finder';

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
		vi.spyOn(MediaWikiAPIs, 'fetchAllRevisions').mockResolvedValue(
			createAsyncGenerator([1, 2, 3])
		);
		vi.spyOn(ItemFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(MediaWikiAPIs, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

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
		vi.spyOn(MediaWikiAPIs, 'fetchAllRevisions').mockResolvedValue(
			createAsyncGenerator([1, 2, 3])
		);
		vi.spyOn(ItemFinder, 'findOneOccurrence').mockResolvedValue(null);

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
		vi.spyOn(MediaWikiAPIs, 'fetchAllRevisions').mockImplementation(() =>
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
		vi.spyOn(MediaWikiAPIs, 'fetchAllRevisions').mockImplementation(() =>
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
		// Mock API calls
		const fetchAllRevisionsMock = vi
			.spyOn(MediaWikiAPIs, 'fetchAllRevisions')
			.mockResolvedValue(createAsyncGenerator([1, 2, 3]));
		vi.spyOn(ItemFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(MediaWikiAPIs, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

		const formData = createFormData({ uptoRevId: '456', pageId: '123' });

		await searchAction(defaultPrevState, formData);

		expect(fetchAllRevisionsMock).toHaveBeenCalledWith(
			expect.anything(), // baseUrl
			expect.anything(), // pageId
			{ uptoRevId: 456 }
		);
	});

	it('calls fetchAllRevisions without uptoRevId when not provided in form data', async () => {
		// Mock API calls
		vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockResolvedValue(123);
		const fetchAllRevisionsMock = vi
			.spyOn(MediaWikiAPIs, 'fetchAllRevisions')
			.mockResolvedValue(createAsyncGenerator([1, 2, 3]));
		vi.spyOn(ItemFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(MediaWikiAPIs, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

		const formData = createFormData({ pageId: '123' }); // No uptoRevId

		await searchAction(defaultPrevState, formData);

		expect(fetchAllRevisionsMock).toHaveBeenCalledWith(
			expect.anything(), // baseUrl
			expect.anything(), // pageId
			{} // Should be empty object
		);
	});

	it('calls fetchAllRevisions with order when provided in form data', async () => {
		// Mock API calls
		const fetchAllRevisionsMock = vi
			.spyOn(MediaWikiAPIs, 'fetchAllRevisions')
			.mockResolvedValue(createAsyncGenerator([1, 2, 3]));
		vi.spyOn(ItemFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(MediaWikiAPIs, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

		const formData = createFormData({ order: 'desc', pageId: '123' });

		await searchAction(defaultPrevState, formData);

		expect(fetchAllRevisionsMock).toHaveBeenCalledWith(
			expect.anything(), // baseUrl
			expect.anything(), // pageId
			{ order: 'desc' }
		);
	});

	it('returns the correct order in the search state', async () => {
		// Mock API calls
		vi.spyOn(MediaWikiAPIs, 'fetchAllRevisions').mockResolvedValue(
			createAsyncGenerator([1, 2, 3])
		);
		vi.spyOn(ItemFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(MediaWikiAPIs, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

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
