import {
	fetchPageId,
	fetchAllRevisions,
	fetchRevisionTexts,
	type RevisionResult,
} from '../services/WikipediaAPI';
import { findOneOccurrence, type Predicate } from '../utils/item-finder';
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
		const revisions = fetchAllRevisions(baseUrl, pageId);

		// Find occurrence of target text
		const foundRevisionId = await findOneOccurrence(
			createTextDetector(targetText),
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

/**
 * Creates a text-based detector for finding occurrences in items
 */
const createTextDetector = (targetText: string) =>
	((item: RevisionResult): number | null =>
		item.text.includes(targetText) ? item.rev : null) satisfies Predicate<
		RevisionResult,
		number
	>;

export const defaultSearchResult = {
	wiki: WIKI_SITES.ENWP,
	pageTitle: '',
	targetText: '',
	revisionId: null,
	error: null,
	searchCount: 0,
} as const satisfies SearchState;
