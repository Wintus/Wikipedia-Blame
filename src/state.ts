/**
 * Type for application state
 */

export type SearchState = {
	wikiUrl: URL;
	pageId: number | null;
	pageTitle: string;
	targetText: string;
	revisionId: number | null;
	order: 'asc' | 'desc';
	error: string | null;
	searchCount: number;
};
