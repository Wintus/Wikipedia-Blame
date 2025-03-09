/**
 * Types for Wikipedia API responses and application state
 */

export type WikiLanguage = 'en' | 'ja';

export type RevisionResult = {
	rev: number;
	text: string;
};

export type SearchResult = {
	language: WikiLanguage;
	pageTitle: string;
	targetText: string;
	revisionId: number | null;
	loading: boolean;
	error: string | null;
};

export const defaultSearchResult = {
	language: 'en',
	pageTitle: '',
	targetText: '',
	revisionId: null,
	loading: false,
	error: null,
} as const satisfies SearchResult;
