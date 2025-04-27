/**
 * Service for interacting with the MediaWiki APIs
 * using both the Action API and the REST API
 *
 * note: `rvcontentformat-main=text/plain` is unavailable for regular pages
 */

import { JSONParser } from '@streamparser/json-whatwg';

export type RevisionResult = {
	rev: number;
	text: string;
};

type Revision<Slot extends string> = {
	revid: number;
	slots: { [key in Slot]: { content: string } };
};

type Page<Slot extends string = 'main'> = {
	pageid: number;
	title: string;
	revisions?: ReadonlyArray<Revision<Slot>>;
};

type RevisionsResponse<Slot extends string = 'main'> = {
	query?: {
		pages?: ReadonlyArray<Page<Slot>>;
	};
	continue?: {
		continue?: string;
		rvcontinue?: string;
	};
};

type Order = 'asc' | 'desc';

const direction = {
	asc: 'newer',
	desc: 'older',
} as const satisfies Record<Order, string>;

const getPageRevisions = <Slot extends string = 'main'>(
	data: RevisionsResponse<Slot>
): ReadonlyArray<Revision<Slot>> => data?.query?.pages?.[0]?.revisions ?? [];

const convert = (revision: Revision<'main'>): RevisionResult => ({
	rev: revision.revid,
	text: revision?.slots?.main?.content ?? '',
});

/**
 * Fetches the page ID for a given title using the REST API
 *
 * see https://www.mediawiki.org/wiki/API:REST_API/Reference#Get_page
 *
 * Post-condition: this function may raise an error on request failed
 */
export async function fetchPageId(
	baseUrl: URL,
	pageTitle: string
): Promise<number> {
	const url = new URL(`/w/rest.php/v1/page/${pageTitle}/bare`, baseUrl);
	// guard
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error('Failed to fetch page ID', {
			cause: response,
		});
	}
	// request
	const page = await response.json();
	return page.id;
}

/**
 * Fetches the text content of multiple revisions using formatversion=2.
 * Uses streaming JSON parsing for potentially large responses.
 *
 * Precondition: The number of revision IDs cannot exceed 50 due to API limitations.
 * Precondition: The revision IDs is assumed of a single page.
 * @returns An async generator yielding RevisionResult objects as they are parsed.
 * @throws {Error} If the fetch request fails or the response body is missing.
 */
export async function* fetchRevisionTexts(
	baseUrl: URL,
	revIds: ReadonlyArray<number>
): AsyncGenerator<RevisionResult, void, unknown> {
	if (revIds.length > 50) {
		throw new Error(
			'The number of revision IDs cannot exceed 50 due to API limitations.'
		);
	}
	const revIdsStr = revIds.join('|');
	const url = new URL(
		`/w/api.php?action=query&prop=revisions&revids=${revIdsStr}&rvprop=ids|content&formatversion=2&format=json&origin=*&rvslots=main`,
		baseUrl
	);

	// Create a JSON parser to handle the streaming response
	const parser = new JSONParser({
		paths: ['$.query.pages.*.revisions.*'],
		keepStack: false,
	});

	try {
		const response = await fetch(url);
		if (!response.ok || !response.body) {
			throw new Error(`Failed to fetch revision texts: ${response.statusText}`);
		}

		const elemStream = response.body.pipeThrough(parser);
		for await (const { value, stack } of elemStream) {
			if (value == null) {
				continue;
			}
			if (stack[4]?.key !== 'revisions') {
				continue;
			}
			if (typeof value === 'object' && 'revid' in value && 'slots' in value) {
				yield convert(value as Revision<'main'>);
			}
		}
	} catch (error) {
		console.error('Error fetching revision texts:', error);
		console.warn('missing revision texts for:', revIds);
		// Re-throw the error to signal failure
		throw error;
	}
}

/**
 * Fetches all revisions of a page as an async generator.
 *
 * The default order is ascending (= newer last = older first), but can be changed to descending.
 * If `uptoRevId` is provided, fetching stops at the timestamp of that revision ID.
 *
 * see https://www.mediawiki.org/wiki/API:Revisions
 */
export async function* fetchAllRevisions(
	baseUrl: URL,
	pageId: number,
	options?: { order?: Order; uptoRevId?: number }
): AsyncGenerator<number, void, unknown> {
	const order = options?.order ?? 'asc';
	const uptoRevId = options?.uptoRevId;
	const dir = direction[order];
	try {
		let continueParam: string | null = null;
		do {
			const url = new URL('/w/api.php', baseUrl);
			url.searchParams.append('action', 'query');
			url.searchParams.append('prop', 'revisions');
			url.searchParams.append('pageids', pageId.toString());
			url.searchParams.append('rvprop', 'ids');
			url.searchParams.append('rvlimit', 'max');
			url.searchParams.append('rvdir', dir);
			if (uptoRevId != null) {
				url.searchParams.append('rvendid', uptoRevId.toString());
			}
			url.searchParams.append('formatversion', '2');
			url.searchParams.append('format', 'json');
			url.searchParams.append('origin', '*');
			if (continueParam) {
				url.searchParams.append('rvcontinue', continueParam);
			}
			// request
			const response = await fetch(url);
			const data: RevisionsResponse<never> = await response.json();
			// iterate over the revisions
			const pageRevs = getPageRevisions(data);
			for (const rev of pageRevs) {
				yield rev.revid;
			}
			// update the cursor
			continueParam = data?.continue?.rvcontinue ?? null;
		} while (continueParam);
	} catch (error) {
		console.error('Error fetching all revisions:', error);
	}
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach, afterEach } = await import(
		'vitest'
	);
	const { WIKI_SITES } = await import('../wiki');

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

				await expect(fetchPageId(baseUrl, 'Test Page')).rejects.toThrow(
					new Error('Network error')
				);
			});

			it('returns null on unsuccessful response', async () => {
				const mockResponse = { ok: false, statusText: 'Not Found' };
				mockFetch.mockResolvedValue(mockResponse);

				await expect(fetchPageId(baseUrl, 'Test Page')).rejects.toThrow(
					new Error('Failed to fetch page ID', { cause: mockResponse })
				);
			});
		});

		describe('fetchRevisionTexts', async () => {
			it('fetches revision texts successfully', async () => {
				const mockApiResponse = {
					query: {
						pages: [
							{
								pageid: 123,
								title: 'dummy',
								revisions: [
									{ revid: 1, slots: { main: { content: 'Content 1' } } },
									{ revid: 2, slots: { main: { content: 'Content 2' } } },
								],
							},
						],
					},
				} satisfies RevisionsResponse<'main'>;
				const jsonString = JSON.stringify(mockApiResponse);
				const encoder = new TextEncoder();
				const encoded = encoder.encode(jsonString);

				const mockStream = new ReadableStream({
					start(controller) {
						controller.enqueue(encoded);
						controller.close();
					},
				});

				const mockFetchResponse = {
					ok: true,
					body: mockStream,
					statusText: 'OK',
				};
				mockFetch.mockResolvedValue(mockFetchResponse);

				const revisions = fetchRevisionTexts(baseUrl, [1, 2]);
				const revisionsArray = await Array.fromAsync(revisions);

				expect(revisionsArray).toEqual([
					{ rev: 1, text: 'Content 1' },
					{ rev: 2, text: 'Content 2' },
				]);
			});

			it('returns empty array on network error', async () => {
				mockFetch.mockRejectedValue(new Error('Network error'));

				const revisions = fetchRevisionTexts(baseUrl, [12345]);

				await expect(Array.fromAsync(revisions)).rejects.toThrow();
			});

			it('throws error when revision IDs exceed 50', async () => {
				const largeRevisionList = Array.from({ length: 51 }, (_, i) => i);

				const revisions = fetchRevisionTexts(baseUrl, largeRevisionList);
				await expect(Array.fromAsync(revisions)).rejects.toThrow(
					'The number of revision IDs cannot exceed 50'
				);
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
				expect(revisions).toEqual(
					expect.arrayContaining([12345, 67890, 54321])
				);
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

			it('includes rvendid when order is desc and uptoRevId is provided', async () => {
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
				expectedUrl.searchParams.set('rvendid', '8888'); // Check this param
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
}
