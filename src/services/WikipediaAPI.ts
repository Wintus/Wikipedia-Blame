/**
 * Service for interacting with the Wikipedia API
 *
 * note: `rvcontentformat-main=text/plain` is unavailable for regular pages
 */

import { WikiLanguage, RevisionResult } from '../types';

type Revision<Slot extends string> = {
	revid: number;
	slots: { [key in Slot]: { content: string } };
};

type WikipediaPage = {
	pageid: number;
	title: string;
	revisions?: ReadonlyArray<Revision>;
};

type WikipediaResponse = {
	query?: {
		pages?: ReadonlyArray<WikipediaPage>;
	};
	continue?: {
		continue?: string;
		rvcontinue?: string;
	};
};

const getPageRevisions = <Slot extends string = 'main'>(
	data
): ReadonlyArray<Revision<Slot>> => data?.query?.pages?.[0]?.revisions ?? [];
const convert = (revision: Revision<'main'>): RevisionResult => ({
	rev: revision.revid,
	text: revision?.slots?.main?.content ?? '',
});

/**
 * Fetches the text content of multiple Wikipedia revisions using formatversion=2.
 *
 * Precondition: The number of revision IDs cannot exceed 50 due to API limitations.
 * Precondition: The revision IDs is assumed of a single page.
 */
export async function fetchRevisionTexts(
	revIds: ReadonlyArray<number>,
	lang: WikiLanguage = 'en'
): Promise<ReadonlyArray<RevisionResult>> {
	if (revIds.length > 50) {
		throw new Error(
			'The number of revision IDs cannot exceed 50 due to API limitations.'
		);
	}
	const revIdsStr = revIds.join('|');
	const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&revids=${revIdsStr}&rvprop=ids|content&formatversion=2&format=json&origin=*&rvslots=main`;

	try {
		const response = await fetch(url);
		const data = await response.json();
		const revisions = getPageRevisions(data).map(convert) ?? [];
		return revisions;
	} catch (error) {
		console.error('Error fetching revision texts:', error);
		return [];
	}
}

/**
 * Fetches all revisions of a Wikipedia page in batches of 500.
 *
 * TODO: consider to use pageids instead of titles
 */
export async function fetchAllRevisions(
	pageTitle: string,
	lang: WikiLanguage = 'en'
): Promise<ReadonlyArray<number>> {
	const revisions: number[] = [];
	try {
		let continueParam: string | null;
		do {
			const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
			url.searchParams.append('action', 'query');
			url.searchParams.append('prop', 'revisions');
			url.searchParams.append('titles', pageTitle);
			url.searchParams.append('rvprop', 'ids');
			url.searchParams.append('rvlimit', '500');
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
