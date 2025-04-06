import {
	fetchPageId,
	fetchAllRevisions,
	fetchRevisionTexts,
} from '../services/WikipediaAPI';
import { findOneOccurrence } from '../utils/RevisionFinder';
import { type WikiSite, type SearchResult } from '../wiki';

export async function searchAction(
	prevState: SearchResult,
	formData: FormData
): Promise<SearchResult> {
	// Parse form data
	const wiki: WikiSite = JSON.parse(formData.get('wiki') as string);
	const pageTitle = formData.get('pageTitle') as string;
	const targetText = formData.get('targetText') as string;

	// Validate inputs
	if (!pageTitle || !targetText) {
		return {
			...prevState,
			error: 'Please provide both a page title and text to search for',
			loading: false,
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
				loading: false,
				revisionId: null,
			};
		}

		// Fetch all revisions
		// TODO: ES2024 Array.fromAsync
		const revisions = await fetchAllRevisions(baseUrl, pageId);

		// Find occurrence of target text
		const foundRevisionId = await findOneOccurrence(
			targetText,
			(revIds) => fetchRevisionTexts(baseUrl, revIds),
			revisions
		);

		// Return updated search result
		return {
			wiki,
			pageTitle,
			targetText,
			loading: false,
			revisionId: foundRevisionId,
			error: foundRevisionId ? null : 'Text not found in any revision',
		};
	} catch (error) {
		return {
			...prevState,
			wiki,
			pageTitle,
			targetText,
			loading: false,
			error:
				error instanceof Error ? error.message : 'An unknown error occurred',
			revisionId: null,
		};
	}
}
