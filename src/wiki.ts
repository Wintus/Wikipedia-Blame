/**
 * Types for Wikipedia API responses and application state
 */

export type WikiSite = {
	id: string;
	name: string;
	url: URL;
};

export const WIKI_SITES: Record<WikiSite['id'], WikiSite> = {
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
};

export type RevisionResult = {
	rev: number;
	text: string;
};

export type OnSearchFn = (
	wiki: WikiSite,
	pageTitle: string,
	targetText: string
) => Promise<void>;

export type SearchResult = {
	wiki: WikiSite;
	pageTitle: string;
	targetText: string;
	loading: boolean;
	revisionId: number | null;
	error: string | null;
};

export const defaultSearchResult = {
	wiki: WIKI_SITES.ENWP,
	pageTitle: '',
	targetText: '',
	loading: false,
	revisionId: null,
	error: null,
} as const satisfies SearchResult;
