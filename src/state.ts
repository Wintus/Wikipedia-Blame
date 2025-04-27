import type { WikiSite } from './wiki';

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
