/**
 * Types for Wikipedia API responses and application state
 */

export type WikiLanguage = 'en' | 'ja';

export type RevisionResult = {
	rev: number;
	text: string;
};

export type OnSearchFn = (
	pageTitle: string,
	targetText: string,
	language: WikiLanguage
) => Promise<void>;

export type SearchResult = {
	language: WikiLanguage;
	pageTitle: string;
	targetText: string;
	loading: boolean;
	revisionId: number | null;
	error: string | null;
};

export const defaultSearchResult = {
	language: 'en',
	pageTitle: '',
	targetText: '',
	loading: false,
	revisionId: null,
	error: null,
} as const satisfies SearchResult;
