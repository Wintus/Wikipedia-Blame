import { WikiLanguage, RevisionResult, WikipediaResponse } from '../types';

type Revision<Slot extends string = 'main'> = {
	revid: number;
	slots: { [key in Slot]: { content: string } };
};

/**
 * Service for interacting with the Wikipedia API
 *
 * note: `rvcontentformat-main=text/plain` is unavailable for regular pages
 */
export const WikipediaAPI = {
	/**
	 * Fetches the text content of a Wikipedia revision using formatversion=2.
	 */
	async getRevisionText(
		revId: number,
		lang: WikiLanguage = 'en'
	): Promise<string | null> {
		const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&revids=${revId}&rvprop=ids|content&formatversion=2&format=json&origin=*&rvslots=main`;
		try {
			const response = await fetch(url);
			const data = await response.json();
			return (
				data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? null
			);
		} catch (error) {
			console.error('Error fetching revision text:', error);
			return null;
		}
	},

	/**
	 * Fetches the text content of multiple Wikipedia revisions using formatversion=2.
	 *
	 * Precondition: The number of revision IDs cannot exceed 50 due to API limitations.
	 * Precondition: The revision IDs is assumed of a single page.
	 */
	async getRevisionTexts(
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
			const revisions =
				data?.query?.pages?.[0]?.revisions.map((rev: Revision) => ({
					rev: rev.revid,
					text: rev.slots.main.content,
				})) ?? [];
			return revisions;
		} catch (error) {
			console.error('Error fetching revision texts:', error);
			return [];
		}
	},

	/**
	 * Fetches all revisions of a Wikipedia page in batches of 500.
	 *
	 * TODO: consider to use pageids instead of titles
	 */
	async getAllRevisions(
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

				const page = data?.query?.pages?.[0];
				if (page?.revisions) {
					revisions.push(...page.revisions.map((rev) => rev.revid));
				}

				continueParam = data?.continue?.rvcontinue ?? null;
			} while (continueParam);
		} catch (error) {
			console.error('Error fetching all revisions:', error);
		}
		return revisions;
	},

	/**
	 * Gets the URL for a specific revision
	 */
	getRevisionUrl(revId: number, lang: WikiLanguage = 'en'): string {
		return `https://${lang}.wikipedia.org/w/index.php?oldid=${revId}`;
	},
};
