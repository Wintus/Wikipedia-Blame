// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NonNullish = {};
export type Predicate<S, T extends NonNullish> = (item: S) => T | null;

/**
 * Finds an occurrence of a target string in a set of items.
 * Starts with a randomized sampling approach, then falls back to a full batch search exhaustively if necessary.
 */
export async function findOneOccurrence<T extends number, U extends NonNullish>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	items: AsyncGenerator<T, unknown, unknown>
): Promise<T | null> {
	const samplingRatio = 0.1;
	const sampledItems = [];
	const sampledCount = 50;
	const fallbackItems = [];
	const fallbackCount = 200;
	for await (const item of items) {
		// Randomized sampling
		if (Math.random() < samplingRatio) {
			sampledItems.push(item);
		} else {
			fallbackItems.push(item);
		}
		// Fetch and check for target condition over sampled items
		if (sampledItems.length > sampledCount) {
			const found = await fetchAndFind(
				predicate,
				fetcher,
				sampledItems.splice(0, batchSize)
			);
			if (found != null) return found;
		}
		// Fetch and check for target condition over fallback items
		if (fallbackItems.length > fallbackCount) {
			const found = await fetchAndFind(
				predicate,
				fetcher,
				fallbackItems.splice(0, batchSize)
			);
			if (found != null) return found;
		}
	}
	// consume the rest of the items
	const rest = [...sampledItems, ...fallbackItems];
	if (rest.length > 0) {
		const found = await batchSearch(predicate, fetcher, rest);
		if (found != null) return found;
	}
	// if no item is found, return null
	return null;
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
export async function batchSearch<T extends number, U extends NonNullish>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	items: ReadonlyArray<T>
): Promise<T | null> {
	for (const batch of batches(batchSize, items)) {
		const found = await fetchAndFind(predicate, fetcher, batch);
		if (found != null) return found;
	}
	return null;
}

/**
 * Fetches items in a batch and finds the first item that meets the condition.
 */
async function fetchAndFind<T extends number, U extends NonNullish>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	batch: ReadonlyArray<T>
): Promise<T | null> {
	// Fetch items in parallel and check for condition
	const items = await fetcher(batch);
	// Return an item where the condition is met
	return items.map(predicate).find((rev) => rev != null) ?? null;
}
