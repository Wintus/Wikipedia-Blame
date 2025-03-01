// this is the main ideas and algorithms for this project

/**
 * Fetches the text content of a Wikipedia revision using formatversion=2.
 */
async function getRevisionText(revId: number): Promise<string | null> {
	const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&revids=${revId}&rvprop=content&formatversion=2&format=json&origin=*`;
	const response = await fetch(url);
	const data = await response.json();
	return data?.query?.pages?.[0]?.revisions?.[0]?.content ?? null;
}

type RevisionResult = { rev: number; text: string };

/**
 * Fetches the text content of multiple Wikipedia revisions using formatversion=2.
 *
 * Precondition: The number of revision IDs cannot exceed 50 due to API limitations.
 * Precondition: The revision IDs is assumed of a single page.
 */
async function getRevisionTexts(
	revIds: ReadonlyArray<number>
): Promise<ReadonlyArray<RevisionResult>> {
	if (revIds.length > 50) {
		throw new Error(
			'The number of revision IDs cannot exceed 50 due to API limitations.'
		);
	}
	const revIdsStr = revIds.join('|');
	const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&revids=${revIdsStr}&rvprop=content&formatversion=2&format=json&origin=*`;
	const response = await fetch(url);
	const data = await response.json();
	const revisions =
		data?.query?.pages?.[0]?.revisions.map((rev: any) => ({
			rev: rev.revid,
			text: rev.content,
		})) ?? [];
	return revisions;
}

/**
 * Fisher-Yates shuffle (non-destructive shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array]; // Shallow copy to avoid modifying the original array
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Finds the first occurrence of a target string in a set of revisions.
 * Starts with a randomized sampling approach, then falls back to a full batch search if necessary.
 */
async function findFirstOccurrence(
	targetText: string,
	revList: number[]
): Promise<number | null> {
	if (revList.length === 0) return null;

	// Randomized sampling: 10% of the list or at least 5 revisions
	const sampleSize = Math.max(5, Math.floor(revList.length * 0.1));
	const sampledRevs = shuffleArray(revList).slice(0, sampleSize);

	// Fetch revisions in parallel and check for target text
	const results: (number | null)[] = await Promise.all(
		sampledRevs.map(async (rev) => {
			const text = await getRevisionText(rev);
			return text?.includes(targetText) ?? null;
		})
	);

	// Return the first revision where the target text appears
	const found = results.find((rev) => rev != null);
	if (found) return found;

	// If not found in the sample, proceed with exhaustive search
	return await exhaustiveSearch(revList, targetText);
}

/**
 * Performs an exhaustive search by fetching revisions in batches of 50.
 * Used as a fallback if randomized sampling does not find the target text.
 */
async function exhaustiveSearch(
	revList: number[],
	targetText: string
): Promise<number | null> {
	const batchSize = 50;
	for (let i = 0; i < revList.length; i += batchSize) {
		const batch = revList.slice(i, i + batchSize);
		const results: (number | null)[] = await Promise.all(
			batch.map(async (rev) => {
				const text = await getRevisionText(rev);
				return text?.includes(targetText) ?? null;
			})
		);

		const found = results.find((rev) => rev != null);
		if (found) return found;
	}
	return null;
}

/**
 * Fetches all revisions of a Wikipedia page in batches of 500.
 */
async function getAllRevisions(pageTitle: string): Promise<number[]> {
	const revisions: number[] = [];
	let continueParam: string | null = null;

	do {
		const url = new URL('https://en.wikipedia.org/w/api.php');
		url.searchParams.append('action', 'query');
		url.searchParams.append('prop', 'revisions');
		url.searchParams.append('titles', pageTitle);
		url.searchParams.append('rvprop', 'ids');
		url.searchParams.append('rvlimit', '500');
		url.searchParams.append('formatversion', '2');
		url.searchParams.append('format', 'json');
		url.searchParams.append('origin', '*');
		if (continueParam) url.searchParams.append('rvcontinue', continueParam);

		const response = await fetch(url.toString());
		const data = await response.json();

		const page = data?.query?.pages?.[0];
		if (page?.revisions) {
			revisions.push(
				...page.revisions.map((rev: { revid: number }) => rev.revid)
			);
		}

		continueParam = data?.continue?.rvcontinue ?? null;
	} while (continueParam);

	return revisions;
}
