/**
 * Types for application state
 */

/** What the user is searching for: what the form holds and what a result is about. */
export type QueryState = {
	wikiUrl: URL;
	pageTitle: string;
	targetText: string;
	order: 'asc' | 'desc';
};

/** What a completed search produced. */
export type ResultState = {
	revisionId: number | null;
	error: string | null;
};

/** The whole action state: query, the page it resolved to, and the outcome. */
export type SearchState = QueryState &
	ResultState & {
		pageId: number | null;
		searchCount: number;
	};

/** What the result view renders. */
export type ResultViewState = QueryState &
	ResultState & {
		searchCount: number;
	};
