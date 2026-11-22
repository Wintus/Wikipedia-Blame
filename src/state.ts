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

/** The `useActionState` initial value: no search has run yet. */
export type InitialState = {
	status: 'initial';
};

/** What a completed search produced. */
export type OutcomeState =
	| { status: 'not-found' }
	| { status: 'found'; revisionId: number }
	| { status: 'error'; message: string };

/** The whole action state: query, the page it resolved to, and the outcome. */
export type SearchState = QueryState &
	(InitialState | OutcomeState) & {
		pageId: number | null;
	};

/** What `searchAction` returns: a completed search, never `initial`. */
export type SearchOutcomeState = QueryState &
	OutcomeState & {
		pageId: number | null;
	};

/** What the result view renders. */
export type ResultViewState = QueryState & (InitialState | OutcomeState);
