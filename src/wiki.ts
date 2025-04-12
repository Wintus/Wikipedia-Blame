/**
 * Types for Wikipedia API responses and application state
 */

export type WikiSite = {
	id: string;
	name: string;
	url: URL;
};

export const WIKI_SITES = {
	ENWP: {
		id: 'enwp',
		name: 'English Wikipedia',
		url: new URL('https://en.wikipedia.org'),
	},
	JAWP: {
		id: 'jawp',
		name: 'Japanese Wikipedia',
		url: new URL('https://ja.wikipedia.org'),
	},
} as const satisfies Record<WikiSite['id'], WikiSite>;

export type OnSearchFn = (
	wiki: WikiSite,
	pageTitle: string,
	targetText: string
) => Promise<void>;

export type SearchResult = {
	wiki: WikiSite;
	pageTitle: string;
	targetText: string;
	revisionId: number | null;
	error: string | null;
	searchCount: number;
};

export const defaultSearchResult = {
	wiki: WIKI_SITES.ENWP,
	pageTitle: '',
	targetText: '',
	revisionId: null,
	error: null,
	searchCount: 0,
} as const satisfies SearchResult;
