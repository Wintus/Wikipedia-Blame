import {
	fetchPageId,
	fetchAllRevisions,
	fetchRevisionTexts,
} from '../services/WikipediaAPI';
import { findOneOccurrence, type Predicate } from '../utils/item-finder';
import { type WikiSite, type SearchResult } from '../wiki';

export async function searchAction(
	prevState: SearchResult,
	formData: FormData
): Promise<SearchResult> {
	// Parse form data
	const wiki: WikiSite = JSON.parse(formData.get('wiki') as string);
	const pageTitle = (formData.get('pageTitle') as string)?.trim();
	const targetText = (formData.get('targetText') as string)?.trim();

	// Validate inputs
	if (!pageTitle || !targetText) {
		return {
			...prevState,
			error: 'Please provide both a page title and text to search for',
			searchCount: prevState.searchCount + 1,
		};
	}

	try {
		const baseUrl = wiki.url;

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
export const createTextDetector = <
	T extends number,
	U extends { rev: T; text?: string },
>(
	targetText: string
) =>
	((item: U): T | null =>
		item.text?.includes(targetText) ? item.rev : null) satisfies Predicate<
		U,
		T
	>;
