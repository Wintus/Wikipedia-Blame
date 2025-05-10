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

type Revision<Slot extends string = 'main'> = {
	revid: number;
	slots: { [key in Slot]: { content: string } };
};

type Order = 'asc' | 'desc';

const direction = {
	asc: 'newer',
	desc: 'older',
} as const satisfies Record<Order, string>;

const convert = (revision: Revision<'main'>): RevisionResult => ({
	rev: revision.revid,
	text: revision.slots.main.content,
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
): AsyncGenerator<RevisionResult, void, unknown> {
	const order = options?.order ?? 'asc';
	const uptoRevId = options?.uptoRevId;
	const dir = direction[order];
	try {
		let continueParam: string | null = null;
		do {
			const params = new URLSearchParams({
				action: 'query',
				prop: 'revisions',
				pageids: pageId.toString(),
				rvprop: 'ids|content',
				rvslots: 'main',
				rvlimit: 'max',
				rvdir: dir,
				formatversion: '2',
				format: 'json',
				origin: '*',
			});
			if (uptoRevId != null) {
				params.set('rvendid', uptoRevId.toString());
			}
			if (continueParam) {
				params.set('rvcontinue', continueParam);
			}
			const url = new URL('/w/api.php', baseUrl);
			url.search = params.toString();
			// request
			const response = await fetch(url);
			if (!response.ok || !response.body) {
				throw new Error(
					`Failed to fetch revision texts: ${response.statusText}`
				);
			}

			// Create a JSON parser to handle the streaming response
			const parser = new JSONParser({
				paths: [
					'$.continue.rvcontinue',
					'$.query.pages.*.revisions.*.slots.main.content',
				],
			});
			const elemStream = response.body.pipeThrough(parser);
			for await (const { key, value, stack } of elemStream) {
				if (value == null) {
					continue;
				} else if (key === 'rvcontinue') {
					// update the cursor
					continueParam = value as string;
				} else if (key === 'content') {
					yield convert(stack[6]?.value as Revision);
				}
			}
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

	describe('WikipediaAPI', () => {
		const baseUrl = new URL('https://en.wikipedia.org');
		const mockFetch = vi.fn();
		const mockConsoleError = vi.fn();

		beforeEach(() => {
			vi.stubGlobal('fetch', mockFetch);
			vi.stubGlobal('console', { ...console, error: mockConsoleError });
		});

		afterEach(() => {
			vi.clearAllMocks();
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

		describe('fetchAllRevisions', () => {
			it('fetches all revisions successfully', async () => {
				const mockJsonPage1 = {
					query: {
						pages: [
							{
								pageid: 123,
								title: 'Test Page',
								revisions: [
									{ revid: 12345, slots: { main: { content: 'Content 1' } } },
									{ revid: 67890, slots: { main: { content: 'Content 2' } } },
								],
							},
						],
					},
					continue: { rvcontinue: 'continue-token-page1' },
				};

				const mockJsonPage2 = {
					query: {
						pages: [
							{
								pageid: 123,
								title: 'Test Page',
								revisions: [
									{ revid: 54321, slots: { main: { content: 'Content 3' } } },
								],
							},
						],
					},
					// No continue for the last page
				};

				const createMockStream = (jsonPayload: object) => {
					const jsonString = JSON.stringify(jsonPayload);
					return new ReadableStream({
						start(controller) {
							controller.enqueue(jsonString);
							controller.close();
						},
					});
				};

				mockFetch
					.mockImplementationOnce(async () => ({
						ok: true,
						body: createMockStream(mockJsonPage1),
					}))
					.mockImplementationOnce(async () => ({
						ok: true,
						body: createMockStream(mockJsonPage2),
					}));

				const all = fetchAllRevisions(baseUrl, 1234);
				const revisions = await Array.fromAsync(all);

				expect(mockFetch).toHaveBeenCalledTimes(2);
				expect(revisions).toEqual([
					{ rev: 12345, text: 'Content 1' },
					{ rev: 67890, text: 'Content 2' },
					{ rev: 54321, text: 'Content 3' },
				]);
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

				const params = new URLSearchParams({
					action: 'query',
					prop: 'revisions',
					pageids: '1234',
					rvprop: 'ids|content',
					rvslots: 'main',
					rvlimit: 'max',
					rvdir: 'newer',
					formatversion: '2',
					format: 'json',
					origin: '*',
				});
				params.set('rvendid', '9999'); // Check this param
				const expectedUrl = new URL('/w/api.php', baseUrl);
				expectedUrl.search = params.toString();

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

				const params = new URLSearchParams({
					action: 'query',
					prop: 'revisions',
					pageids: '1234',
					rvprop: 'ids|content',
					rvslots: 'main',
					rvlimit: 'max',
					rvdir: 'older',
					formatversion: '2',
					format: 'json',
					origin: '*',
				});
				params.set('rvendid', '8888'); // Check this param
				const expectedUrl = new URL('/w/api.php', baseUrl);
				expectedUrl.search = params.toString();

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
