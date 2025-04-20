import {
	fetchPageId,
	fetchAllRevisions,
	fetchRevisionTexts,
	type RevisionResult,
} from '../services/MediaWikiAPIs';
import { findOneOccurrence } from '../utils/item-finder';
import { type WikiSite, type SearchState, WIKI_SITES } from '../wiki';

export async function searchAction(
	prevState: SearchState,
	formData: FormData
): Promise<SearchState> {
	// Parse form data
	const wikiId = formData.get('wikiId')?.toString().toUpperCase();
	const pageTitle = formData.get('pageTitle')?.toString().trim();
	const targetText = formData.get('targetText')?.toString();

	// Validate inputs
	if (!pageTitle || !targetText) {
		return {
			...prevState,
			error: 'Please provide both a page title and text to search for',
			searchCount: prevState.searchCount + 1,
		};
	}
	if (
		!wikiId ||
		!((key: string): key is keyof typeof WIKI_SITES => key in WIKI_SITES)(
			wikiId
		)
	) {
		return {
			...prevState,
			error: `Invalid wiki site selected: ${wikiId}`,
			searchCount: prevState.searchCount + 1,
		};
	}
	const wiki: WikiSite = WIKI_SITES[wikiId];
	const baseUrl = wiki.url;

	try {
		// Fetch page ID
		const pageId = await fetchPageId(baseUrl, pageTitle);

		if (!pageId) {
			return {
				...prevState,
				wiki,
				pageTitle,
				targetText,
				error: `Page "${pageTitle}" not found.`,
				revisionId: null,
				searchCount: prevState.searchCount + 1,
			};
		}

		// Fetch all revisions
		const uptoRevIdStr = formData.get('uptoRevId')?.toString();
		const uptoRevId = uptoRevIdStr ? parseInt(uptoRevIdStr, 10) : undefined;
		const options = uptoRevId ? { uptoRevId } : {};
		const revisions = fetchAllRevisions(baseUrl, pageId, options);

		// Find occurrence of target text
		const foundRevisionId = await findOneOccurrence(
			(item: RevisionResult): number | null =>
				item.text.includes(targetText) ? item.rev : null,
			(revIds) => fetchRevisionTexts(baseUrl, revIds),
			revisions
		);

		// Return updated search result
		return {
			wiki,
			pageTitle,
			targetText,
			revisionId: foundRevisionId,
			error: foundRevisionId ? null : 'Text not found in any revision',
			searchCount: prevState.searchCount + 1,
		};
	} catch (error) {
		return {
			...prevState,
			wiki,
			pageTitle,
			targetText,
			error:
				error instanceof Error ? error.message : 'An unknown error occurred',
			revisionId: null,
			searchCount: prevState.searchCount + 1,
		};
	}
}

export const defaultSearchResult = {
	wiki: WIKI_SITES.ENWP,
	pageTitle: '',
	targetText: '',
	revisionId: null,
	error: null,
	searchCount: 0,
} as const satisfies SearchState;
