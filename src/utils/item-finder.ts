// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NonNullish = {};
export type Predicate<S, T extends NonNullish> = (item: S) => T | null;

const batchSize = 50;

export async function findOneOccurrence<T extends number, U extends NonNullish>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	items: AsyncGenerator<T, unknown, unknown>
): Promise<T | null> {
	const samplingRatio = 0.1;
	const sampledCount = 50;
	const fallbackCount = 200;
	// fetch and find in batches
	for await (const batch of itemGenerator(
		items,
		samplingRatio,
		sampledCount,
		fallbackCount
	)) {
		const found = await fetchAndFind(predicate, fetcher, batch);
		if (found != null) return found;
	}
	// if no item is found, return null
	return null;
}

/**
 * Finds an occurrence of a target string in a set of items.
 * Starts with a randomized sampling approach, then falls back to a full batch search exhaustively if necessary.
 */
async function* itemGenerator<T extends number>(
	items: AsyncGenerator<T, unknown, unknown>,
	samplingRatio: number,
	sampledCount: number,
	fallbackCount: number
): AsyncGenerator<ReadonlyArray<T>, void, unknown> {
	const sampledItems: T[] = [];
	const fallbackItems: T[] = [];
	// main loop for sampling and yielding in different frequencies
	for await (const item of items) {
		if (Math.random() < samplingRatio) {
			sampledItems.push(item);
		} else {
			fallbackItems.push(item);
		}
		// yield a batch of items if the sampled or fallback items reach each threshold
		if (sampledItems.length >= sampledCount) {
			yield sampledItems.splice(0, batchSize) as ReadonlyArray<T>;
		}
		if (fallbackItems.length >= fallbackCount) {
			yield fallbackItems.splice(0, batchSize) as ReadonlyArray<T>;
		}
	}
	// yield remaining items
	if (sampledItems.length > 0) {
		yield* batches(batchSize, sampledItems as ReadonlyArray<T>);
	}
	if (fallbackItems.length > 0) {
		yield* batches(batchSize, fallbackItems as ReadonlyArray<T>);
	}
}

function* batches<T>(
	batchSize: number,
	array: ReadonlyArray<T>
): Generator<ReadonlyArray<T>> {
	for (let i = 0; i < array.length; i += batchSize) {
		yield array.slice(i, i + batchSize);
	}
}

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
