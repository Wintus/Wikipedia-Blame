import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	fetchPageId,
	fetchRevisionTexts,
	fetchAllRevisions,
} from '../MediaWikiAPIs';
import { WIKI_SITES } from '../../wiki';

describe('WikipediaAPI', () => {
	const baseUrl = WIKI_SITES.ENWP.url;
	const mockFetch = vi.fn();
	const mockConsoleError = vi.fn();

	beforeEach(() => {
		vi.stubGlobal('fetch', mockFetch);
		vi.stubGlobal('console', { ...console, error: mockConsoleError });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('fetchPageId', () => {
		it('returns page ID when request is successful', async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: 12345 }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const pageId = await fetchPageId(baseUrl, 'Test Page');

			const expectedUrl = new URL(
				'/w/rest.php/v1/page/Test Page/bare',
				baseUrl
			);
			expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
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

			const expectedUrl = new URL(
				`/w/api.php?action=query&prop=revisions&revids=12345&rvprop=ids|content&formatversion=2&format=json&origin=*&rvslots=main`,
				baseUrl
			);
			expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
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

			const all = fetchAllRevisions(baseUrl, 1234);
			const revisions = await Array.fromAsync(all);

			// Check that fetch was called at least once and the correct revisions are returned
			expect(mockFetch).toHaveBeenCalled();
			expect(revisions).toEqual(expect.arrayContaining([12345, 67890, 54321]));
			expect(revisions.length).toBe(3);
		});

		it('includes rvendid when order is asc and uptoRevId is provided', async () => {
			const mockResponse = {
				json: vi
					.fn()
					.mockResolvedValue({ query: { pages: [{ revisions: [] }] } }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const all = fetchAllRevisions(baseUrl, 1234, {
				order: 'asc',
				uptoRevId: 9999,
			});
			await Array.fromAsync(all); // Consume the generator to trigger fetch

			const expectedUrl = new URL('/w/api.php', baseUrl);
			expectedUrl.searchParams.set('action', 'query');
			expectedUrl.searchParams.set('prop', 'revisions');
			expectedUrl.searchParams.set('pageids', '1234');
			expectedUrl.searchParams.set('rvprop', 'ids');
			expectedUrl.searchParams.set('rvlimit', 'max');
			expectedUrl.searchParams.set('rvdir', 'newer');
			expectedUrl.searchParams.set('rvendid', '9999'); // Check this param
			expectedUrl.searchParams.set('formatversion', '2');
			expectedUrl.searchParams.set('format', 'json');
			expectedUrl.searchParams.set('origin', '*');

			expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
		});

		it('includes rvstartid when order is desc and uptoRevId is provided', async () => {
			const mockResponse = {
				json: vi
					.fn()
					.mockResolvedValue({ query: { pages: [{ revisions: [] }] } }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const all = fetchAllRevisions(baseUrl, 1234, {
				order: 'desc',
				uptoRevId: 8888,
			});
			await Array.fromAsync(all); // Consume the generator

			const expectedUrl = new URL('/w/api.php', baseUrl);
			expectedUrl.searchParams.set('action', 'query');
			expectedUrl.searchParams.set('prop', 'revisions');
			expectedUrl.searchParams.set('pageids', '1234');
			expectedUrl.searchParams.set('rvprop', 'ids');
			expectedUrl.searchParams.set('rvlimit', 'max');
			expectedUrl.searchParams.set('rvdir', 'older');
			expectedUrl.searchParams.set('rvstartid', '8888'); // Check this param
			expectedUrl.searchParams.set('formatversion', '2');
			expectedUrl.searchParams.set('format', 'json');
			expectedUrl.searchParams.set('origin', '*');

			expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
		});

		it('does not include boundary params when uptoRevId is not provided', async () => {
			const mockResponse = {
				json: vi
					.fn()
					.mockResolvedValue({ query: { pages: [{ revisions: [] }] } }),
			};
			mockFetch.mockResolvedValue(mockResponse);

			const all = fetchAllRevisions(baseUrl, 1234, { order: 'desc' }); // No uptoRevId
			await Array.fromAsync(all); // Consume the generator

			expect(mockFetch).toHaveBeenCalled();
			const actualUrl: URL = mockFetch.mock.calls[0]?.[0];
			expect(actualUrl.searchParams.has('rvstartid')).toBe(false);
			expect(actualUrl.searchParams.has('rvendid')).toBe(false);
		});

		it('returns empty array on network error', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			const all = fetchAllRevisions(baseUrl, 1234);
			const revisions = await Array.fromAsync(all);

			expect(revisions).toEqual([]);
			expect(console.error).toHaveBeenCalledWith(
				'Error fetching all revisions:',
				expect.any(Error)
			);
		});
	});
});
