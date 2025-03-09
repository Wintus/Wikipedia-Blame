/**
 * Types for Wikipedia API responses and application state
 */

export type WikiLanguage = 'en' | 'ja';

export type RevisionResult = {
	rev: number;
	text: string;
};

export type SearchResult = {
	pageTitle: string;
	targetText: string;
	revisionId: number | null;
	timestamp?: string;
	author?: string;
	loading: boolean;
	error: string | null;
};
