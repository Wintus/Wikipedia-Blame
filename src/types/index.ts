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
	language: WikiLanguage;
	pageTitle: string;
	pageId: number | null;
	targetText: string;
	loading: boolean;
	revisionId: number | null;
	error: string | null;
};

export const defaultSearchResult = {
	language: 'en',
	pageTitle: '',
	pageId: null,
	targetText: '',
	loading: false,
	revisionId: null,
	error: null,
} as const satisfies SearchResult;
