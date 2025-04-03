import { RevisionResult } from '../wiki';

/**
 * Fisher-Yates shuffle (non-destructive shuffle)
 */
export function shuffleArray<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
	const shuffled = [...array]; // Shallow copy to avoid modifying the original array
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Helper function to perform randomized sampling
 */
function sampling<T>(
	array: ReadonlyArray<T>,
	minCount: number = 5,
	samplingRatio: number = 0.1
): ReadonlyArray<T> {
	const sampleSize = Math.max(minCount, array.length * samplingRatio); // let it cast to integer
	return shuffleArray(array).slice(0, sampleSize);
}

/**
 * Finds an occurrence of a target string in a set of revisions.
 * Starts with a randomized sampling approach, then falls back to a full batch search exhaustively if necessary.
 */
export async function findOneOccurrence(
	targetText: string,
	fetcher: (
		revisions: ReadonlyArray<number>
	) => Promise<ReadonlyArray<RevisionResult>>,
	revisions: ReadonlyArray<number>
): Promise<number | null> {
	if (revisions.length === 0) return null;
	// Randomized sampling
	const sampledRevs = sampling(revisions).toSorted();
	// Fetch revisions and check for target text
	const found = await batchSearch(targetText, fetcher, sampledRevs);
	return found ?? (await batchSearch(targetText, fetcher, revisions));
}

function* batches<T>(
	batchSize: number,
	array: ReadonlyArray<T>
): Generator<ReadonlyArray<T>> {
	for (let i = 0; i < array.length; i += batchSize) {
		yield array.slice(i, i + batchSize);
	}
}

const batchSize = 50;

/**
 * Performs a batch search by fetching revisions in batches of 50.
 */
export async function batchSearch(
	targetText: string,
	fetcher: (
		revisions: ReadonlyArray<number>
	) => Promise<ReadonlyArray<RevisionResult>>,
	revisions: ReadonlyArray<number>
): Promise<number | null> {
	for (const batch of batches(batchSize, revisions)) {
		// Fetch revisions in parallel and check for target text
		const revisionResults = await fetcher(batch);
		const results = revisionResults.map(({ rev, text }) =>
			text?.includes(targetText) ? rev : null
		);
		// Return a revision where the target text appears
		const found = results.find((rev) => rev != null);
		if (found) return found;
	}
	return null;
}
