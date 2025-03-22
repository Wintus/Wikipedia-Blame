/**
 * Types for Wikipedia API responses and application state
 */

export type WikiLanguage = 'en' | 'ja';

export type RevisionResult = {
	rev: number;
	text: string;
};

export type OnSearchFn = (
	baseUrl: string,
	pageTitle: string,
	targetText: string
) => Promise<void>;

export type SearchResult = {
	baseUrl: string;
	pageTitle: string;
	targetText: string;
	loading: boolean;
	revisionId: number | null;
	error: string | null;
};

export const defaultSearchResult = {
	baseUrl: 'https://en.wikipedia.org',
	pageTitle: '',
	targetText: '',
	loading: false,
	revisionId: null,
	error: null,
} as const satisfies SearchResult;
