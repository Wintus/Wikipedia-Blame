import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	fetchPageId,
	fetchRevisionTexts,
	fetchAllRevisions,
	getBaseUrl,
} from '../WikipediaAPI';
import { WIKI_SITES } from '../../wiki';

describe('WikipediaAPI', () => {
	const baseUrl = 'https://en.wikipedia.org';
	const mockFetch = vi.fn();
	const mockConsoleError = vi.fn();

	beforeEach(() => {
		vi.stubGlobal('fetch', mockFetch);
		vi.stubGlobal('console', { ...console, error: mockConsoleError });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('getBaseUrl', () => {
		it('returns correct base URL for different languages', () => {
			expect(getBaseUrl(WIKI_SITES.ENWP)).toBe('https://en.wikipedia.org/');
			expect(getBaseUrl(WIKI_SITES.JAWP)).toBe('https://ja.wikipedia.org/');
		});
	});

	describe('fetchPageId', () => {
		it('returns page ID when request is successful', async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: 12345 }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const pageId = await fetchPageId(baseUrl, 'Test Page');

			expect(mockFetch).toHaveBeenCalledWith(
				`${baseUrl}/w/rest.php/v1/page/Test%20Page/bare`
			);
			expect(pageId).toBe(12345);
		});

		it('returns null on network error', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			const pageId = await fetchPageId(baseUrl, 'Test Page');

			expect(pageId).toBeNull();
			expect(console.error).toHaveBeenCalledWith(
				'Error fetching page ID:',
				expect.any(Error)
			);
		});

		it('returns null on unsuccessful response', async () => {
			const mockResponse = { ok: false };
			mockFetch.mockResolvedValue(mockResponse);

			const pageId = await fetchPageId(baseUrl, 'Test Page');

			expect(pageId).toBeNull();
		});
	});

	describe('fetchRevisionTexts', () => {
		it('fetches revision texts successfully', async () => {
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					query: {
						pages: [
							{
								revisions: [
									{
										revid: 12345,
										slots: { main: { content: 'Test content' } },
									},
								],
							},
						],
					},
				}),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const revisions = await fetchRevisionTexts(baseUrl, [12345]);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining(
					`${baseUrl}/w/api.php?action=query&prop=revisions&revids=12345`
				)
			);
			expect(revisions).toEqual([{ rev: 12345, text: 'Test content' }]);
		});

		it('returns empty array on network error', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			const revisions = await fetchRevisionTexts(baseUrl, [12345]);

			expect(revisions).toEqual([]);
			expect(console.error).toHaveBeenCalledWith(
				'Error fetching revision texts:',
				expect.any(Error)
			);
		});

		it('throws error when revision IDs exceed 50', async () => {
			const largeRevisionList = Array.from({ length: 51 }, (_, i) => i);

			await expect(
				fetchRevisionTexts(baseUrl, largeRevisionList)
			).rejects.toThrow('The number of revision IDs cannot exceed 50');
		});
	});

	describe('fetchAllRevisions', () => {
		it('fetches all revisions successfully', async () => {
			const mockResponses = [
				{
					json: vi.fn().mockResolvedValue({
						query: {
							pages: [
								{
									revisions: [{ revid: 12345 }, { revid: 67890 }],
								},
							],
						},
						continue: { rvcontinue: 'continue-token' },
					}),
				},
				{
					json: vi.fn().mockResolvedValue({
						query: {
							pages: [
								{
									revisions: [{ revid: 54321 }],
								},
							],
						},
					}),
				},
			];
			mockFetch.mockImplementation(() => mockResponses.shift());

			const revisions = await fetchAllRevisions(baseUrl, 1234);

			// Check that fetch was called at least once and the correct revisions are returned
			expect(mockFetch).toHaveBeenCalled();
			expect(revisions).toEqual(expect.arrayContaining([12345, 67890, 54321]));
			expect(revisions.length).toBe(3);
		});

		it('returns empty array on network error', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			const revisions = await fetchAllRevisions(baseUrl, 1234);

			expect(revisions).toEqual([]);
			expect(console.error).toHaveBeenCalledWith(
				'Error fetching all revisions:',
				expect.any(Error)
			);
		});
	});
});
