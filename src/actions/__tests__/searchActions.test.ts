import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAction } from '../searchActions';
import { WIKI_SITES, type SearchState } from '../../wiki';
import * as WikipediaAPI from '../../services/WikipediaAPI';
import * as RevisionFinder from '../../utils/item-finder';

async function* createAsyncGenerator<T>(
	items: ReadonlyArray<T>
): AsyncGenerator<T> {
	for (const item of items) {
		yield item;
	}
}

describe('searchAction', () => {
	const defaultWiki = WIKI_SITES.ENWP;
	const defaultPrevState = {
		wiki: defaultWiki,
		pageTitle: '',
		targetText: '',
		revisionId: null,
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
			error: 'Please provide both a page title and text to search for',
			searchCount: 1,
		});
	});

	it('handles successful search flow', async () => {
		// Mock API calls
		vi.spyOn(WikipediaAPI, 'fetchPageId').mockResolvedValue(123);
		vi.spyOn(WikipediaAPI, 'fetchAllRevisions').mockResolvedValue(
			createAsyncGenerator([1, 2, 3])
		);
		vi.spyOn(RevisionFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(WikipediaAPI, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

		const formData = createFormData();

		const result = await searchAction(defaultPrevState, formData);

		expect(result).toEqual({
			...defaultExpectedState,
			pageTitle: 'Test Page',
			targetText: 'Test Text',
			revisionId: 2,
			error: null,
		});
	});

	it('handles page not found error', async () => {
		// Mock pageId as null
		vi.spyOn(WikipediaAPI, 'fetchPageId').mockResolvedValue(null);

		const formData = createFormData();

		const result = await searchAction(defaultPrevState, formData);

		expect(result).toEqual({
			...defaultExpectedState,
			pageTitle: 'Test Page',
			targetText: 'Test Text',
			revisionId: null,
			error: 'Page "Test Page" not found.',
		});
	});

	it('handles text not found in revisions', async () => {
		// Mock successful page and revision fetch, but no text found
		vi.spyOn(WikipediaAPI, 'fetchPageId').mockResolvedValue(123);
		vi.spyOn(WikipediaAPI, 'fetchAllRevisions').mockResolvedValue(
			createAsyncGenerator([1, 2, 3])
		);
		vi.spyOn(RevisionFinder, 'findOneOccurrence').mockResolvedValue(null);

		const formData = createFormData();

		const result = await searchAction(defaultPrevState, formData);

		expect(result).toEqual({
			...defaultExpectedState,
			pageTitle: 'Test Page',
			targetText: 'Test Text',
			revisionId: null,
			error: 'Text not found in any revision',
		});
	});

	it('handles API exceptions gracefully', async () => {
		// Mock API throwing an exception
		vi.spyOn(WikipediaAPI, 'fetchPageId').mockRejectedValue(
			new Error('Network error')
		);

		const formData = createFormData();

		const result = await searchAction(defaultPrevState, formData);

		expect(result).toEqual({
			...defaultExpectedState,
			pageTitle: 'Test Page',
			targetText: 'Test Text',
			revisionId: null,
			error: 'Network error',
		});
	});

	it('handles non-Error exceptions', async () => {
		// Mock API throwing a non-Error object
		vi.spyOn(WikipediaAPI, 'fetchPageId').mockRejectedValue('Unknown error');

		const formData = createFormData();

		const result = await searchAction(defaultPrevState, formData);

		expect(result).toEqual({
			...defaultExpectedState,
			pageTitle: 'Test Page',
			targetText: 'Test Text',
			revisionId: null,
			error: 'An unknown error occurred',
		});
	});

	it('calls fetchAllRevisions with uptoRevId when provided in form data', async () => {
		// Mock API calls
		vi.spyOn(WikipediaAPI, 'fetchPageId').mockResolvedValue(123);
		const fetchAllRevisionsMock = vi
			.spyOn(WikipediaAPI, 'fetchAllRevisions')
			.mockResolvedValue(createAsyncGenerator([1, 2, 3]));
		vi.spyOn(RevisionFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(WikipediaAPI, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

		const formData = createFormData({ uptoRevId: '456' });

		await searchAction(defaultPrevState, formData);

		expect(fetchAllRevisionsMock).toHaveBeenCalledWith(
			expect.anything(), // baseUrl
			expect.anything(), // pageId
			{ uptoRevId: 456 }
		);
	});

	it('calls fetchAllRevisions without uptoRevId when not provided in form data', async () => {
		// Mock API calls
		vi.spyOn(WikipediaAPI, 'fetchPageId').mockResolvedValue(123);
		const fetchAllRevisionsMock = vi
			.spyOn(WikipediaAPI, 'fetchAllRevisions')
			.mockResolvedValue(createAsyncGenerator([1, 2, 3]));
		vi.spyOn(RevisionFinder, 'findOneOccurrence').mockResolvedValue(2);
		vi.spyOn(WikipediaAPI, 'fetchRevisionTexts').mockResolvedValue([
			{ rev: 2, text: 'Contains Test Text' },
		]);

		const formData = createFormData(); // No uptoRevId

		await searchAction(defaultPrevState, formData);

		expect(fetchAllRevisionsMock).toHaveBeenCalledWith(
			expect.anything(), // baseUrl
			expect.anything(), // pageId
			{} // Should be empty object
		);
	});
});
