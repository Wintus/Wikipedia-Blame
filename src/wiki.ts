/**
 * Types for MediaWiki wikis and application state
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

export type SearchState = {
	wiki: WikiSite;
	pageId: number | null;
	pageTitle: string;
	targetText: string;
	revisionId: number | null;
	order: 'asc' | 'desc';
	error: string | null;
	searchCount: number;
};
