/**
 * Service for interacting with the Wikipedia API
 *
 * note: `rvcontentformat-main=text/plain` is unavailable for regular pages
 */

import { RevisionResult, WikiSite } from '../wiki';

type Revision<Slot extends string> = {
	revid: number;
	slots: { [key in Slot]: { content: string } };
};

type WikipediaPage<Slot extends string = 'main'> = {
	pageid: number;
	title: string;
	revisions?: ReadonlyArray<Revision<Slot>>;
};

type WikipediaResponse<Slot extends string = 'main'> = {
	query?: {
		pages?: ReadonlyArray<WikipediaPage<Slot>>;
	};
	continue?: {
		continue?: string;
		rvcontinue?: string;
	};
};

type Order = 'asc' | 'desc';

export const getBaseUrl = (wiki: WikiSite): string => wiki.url.toString();

const getPageRevisions = <Slot extends string = 'main'>(
	data: WikipediaResponse<Slot>
): ReadonlyArray<Revision<Slot>> => data?.query?.pages?.[0]?.revisions ?? [];
const convert = (revision: Revision<'main'>): RevisionResult => ({
	rev: revision.revid,
	text: revision?.slots?.main?.content ?? '',
});

/**
 * Fetches the page ID for a given title using the REST API
 */
export async function fetchPageId(
	baseUrl: string,
	pageTitle: string
): Promise<number | null> {
	try {
		// Using the /page/{title}/bare endpoint from REST API
		const url = `${baseUrl}/w/rest.php/v1/page/${encodeURIComponent(
			pageTitle
		)}/bare`;
		// guard
		const response = await fetch(url);
		if (!response.ok) {
			return null;
		}
		// Return the page ID from the response
		const data = await response.json();
		return data.id;
	} catch (error) {
		console.error('Error fetching page ID:', error);
		return null;
	}
}

/**
 * Fetches the text content of multiple Wikipedia revisions using formatversion=2.
 *
 * Precondition: The number of revision IDs cannot exceed 50 due to API limitations.
 * Precondition: The revision IDs is assumed of a single page.
 */
export async function fetchRevisionTexts(
	baseUrl: string,
	revIds: ReadonlyArray<number>
): Promise<ReadonlyArray<RevisionResult>> {
	if (revIds.length > 50) {
		throw new Error(
			'The number of revision IDs cannot exceed 50 due to API limitations.'
		);
	}
	const revIdsStr = revIds.join('|');
	const url = `${baseUrl}/w/api.php?action=query&prop=revisions&revids=${revIdsStr}&rvprop=ids|content&formatversion=2&format=json&origin=*&rvslots=main`;

	try {
		const response = await fetch(url);
		const data = await response.json();
		const revisions = getPageRevisions(data).map(convert);
		return revisions;
	} catch (error) {
		console.error('Error fetching revision texts:', error);
		return [];
	}
}

/**
 * Fetches all revisions of a Wikipedia page in batches of 500.
 *
 * The default order is ascending (= newer last = older first), but can be changed to descending.
 *
 * see https://www.mediawiki.org/wiki/API:Revisions
 */
export async function fetchAllRevisions(
	baseUrl: string,
	pageId: number,
	order: Order = 'asc'
): Promise<ReadonlyArray<number>> {
	const revisions: number[] = [];
	const dir = order === 'desc' ? 'older' : 'newer';
	try {
		let continueParam: string | null = null;
		do {
			const url = new URL('/w/api.php', baseUrl);
			url.searchParams.append('action', 'query');
			url.searchParams.append('prop', 'revisions');
			url.searchParams.append('pageids', pageId.toString());
			url.searchParams.append('rvprop', 'ids');
			url.searchParams.append('rvlimit', '500');
			url.searchParams.append('rvdir', dir);
			url.searchParams.append('formatversion', '2');
			url.searchParams.append('format', 'json');
			url.searchParams.append('origin', '*');
			if (continueParam) url.searchParams.append('rvcontinue', continueParam);

			const response = await fetch(url.toString());
			const data: WikipediaResponse = await response.json();

			const pageRevs = getPageRevisions<never>(data);
			for (const rev of pageRevs) {
				revisions.push(rev.revid);
			}

			continueParam = data?.continue?.rvcontinue ?? null;
		} while (continueParam);
	} catch (error) {
		console.error('Error fetching all revisions:', error);
	}
	return revisions;
}
