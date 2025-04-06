/**
 * Fisher-Yates shuffle (non-destructive shuffle)
 */
export function shuffleArray<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
	const shuffled = [...array]; // Shallow copy to avoid modifying the original array
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
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
 * Creates a text-based detector for finding occurrences in items
 */
export const createTextDetector =
	<T extends number, U extends { rev: T; text?: string }>(targetText: string) =>
	(item: U): T | null =>
		item.text?.includes(targetText) ? item.rev : null;

/**
 * Finds an occurrence of a target string in a set of items.
 * Starts with a randomized sampling approach, then falls back to a full batch search exhaustively if necessary.
 */
export async function findOneOccurrence<T extends number, U, R extends {}>(
	predicate: (item: U) => R | null,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	// TODO: AsyncGenerator
	items: ReadonlyArray<T>
): Promise<R | null> {
	if (items.length === 0) return null;
	// Randomized sampling
	const sampledItems = sampling(items).toSorted();
	// Fetch items and check for target condition
	const found = await batchSearch(predicate, fetcher, sampledItems);
	return found ?? (await batchSearch(predicate, fetcher, items));
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
 * Performs a batch search by fetching items in batches of 50.
 */
export async function batchSearch<T extends number, U, R extends {}>(
	predicate: (item: U) => R | null,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	items: ReadonlyArray<T>
): Promise<R | null> {
	for (const batch of batches(batchSize, items)) {
		// Fetch items in parallel and check for condition
		const itemResults = await fetcher(batch);
		const results = itemResults.map(predicate);
		// Return an item where the condition is met
		const found = results.find((rev) => rev != null);
		if (found != null) return found;
	}
	return null;
}
