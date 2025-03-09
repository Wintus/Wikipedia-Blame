import { RevisionResult } from '../types';

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
function sampling(
	array: ReadonlyArray<unknown>,
	minCount: number = 5,
	samplingRatio: number = 0.1
): ReadonlyArray<number> {
	const sampleSize = Math.max(
		minCount,
		Math.floor(array.length * samplingRatio)
	);
	return shuffleArray(array).slice(0, sampleSize);
}

/**
 * Finds an occurrence of a target string in a set of revisions.
 * Starts with a randomized sampling approach, then falls back to a full batch search exhaustively if necessary.
 */
export async function findOneOccurrence(
	targetText: string,
	revList: ReadonlyArray<number>,
	fetcher: (
		revIds: ReadonlyArray<number>
	) => Promise<ReadonlyArray<RevisionResult>>
): Promise<number | null> {
	if (revList.length === 0) return null;
	// Randomized sampling
	const sampledRevs = sampling(revList);
	// Fetch revisions and check for target text
	const found = await batchSearch(targetText, sampledRevs, fetcher);
	return found ?? (await batchSearch(targetText, revList, fetcher));
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

const detectorMaker =
	(targetText: string) =>
	({ rev, text }: RevisionResult): string | null =>
		text?.includes(targetText) ? rev : null;

/**
 * Performs a batch search by fetching revisions in batches of 50.
 */
export async function batchSearch(
	targetText: string,
	revList: ReadonlyArray<number>,
	fetcher: (
		revIds: ReadonlyArray<number>
	) => Promise<ReadonlyArray<RevisionResult>>
): Promise<number | null> {
	for (const batch of batches(batchSize, revList)) {
		// Fetch revisions in parallel and check for target text
		const revisionResults = await fetcher(batch);
		const detector = detectorMaker(targetText);
		const results = revisionResults.map(detector);
		// Return a revision where the target text appears
		const found = results.find((rev) => rev != null);
		if (found) return found;
	}
	return null;
}
