import {
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

	// Get page ID from form data
	const pageIdStr = formData.get('pageId')?.toString();

	if (!pageIdStr) {
		return {
			...prevState,
			wiki,
			pageId: null,
			pageTitle,
			targetText,
			revisionId: null,
			error:
				'Page ID not found. Please wait for it to load or check the title.',
			searchCount: prevState.searchCount + 1,
		};
	}

	const pageId = Number.parseInt(pageIdStr, 10);

	if (!Number.isSafeInteger(pageId)) {
		return {
			...prevState,
			wiki,
			pageId: null,
			pageTitle,
			targetText,
			revisionId: null,
			error: 'Invalid Page ID. Please check the title.',
			searchCount: prevState.searchCount + 1,
		};
	}

	try {
		// Fetch all revisions
		const uptoRevIdStr = formData.get('uptoRevId')?.toString();
		const order = formData.get('order')?.toString();
		const options: { uptoRevId?: number; order?: 'asc' | 'desc' } = {};
		const uptoRevId = uptoRevIdStr ? Number.parseInt(uptoRevIdStr, 10) : NaN;
		if (Number.isSafeInteger(uptoRevId)) {
			options.uptoRevId = uptoRevId;
		}
		if (order === 'asc' || order === 'desc') {
			options.order = order;
		}
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
			pageId,
			pageTitle,
			targetText,
			revisionId: foundRevisionId,
			order: order === 'asc' || order === 'desc' ? order : 'asc',
			error: foundRevisionId ? null : 'Text not found in any revision',
			searchCount: prevState.searchCount + 1,
		};
	} catch (error) {
		return {
			...prevState,
			wiki,
			pageId,
			pageTitle,
			targetText,
			revisionId: null,
			error:
				error instanceof Error ? error.message : 'An unknown error occurred',
			searchCount: prevState.searchCount + 1,
		};
	}
}

export const defaultSearchResult = {
	wiki: WIKI_SITES.ENWP,
	pageId: null,
	pageTitle: '',
	targetText: '',
	revisionId: null,
	order: 'asc',
	error: null,
	searchCount: 0,
} as const satisfies SearchState;
