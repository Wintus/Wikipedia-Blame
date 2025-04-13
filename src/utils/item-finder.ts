// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NonNullish = {};
export type Predicate<S, T extends NonNullish> = (item: S) => T | null;

/**
 * Finds the first occurrence of an item that satisfies a given predicate.
 *
 * @template T - The type of the items in the input generator.
 * @template U - The type of the items returned by the fetcher function.
 * @param predicate - A function that takes an item and returns a value or null if the condition is not met.
 * @param fetcher - A function that fetches a batch of items and returns a promise resolving to an array of items.
 * @param items - An asynchronous generator that provides the items to search through.
 * @returns A promise that resolves to the first item that satisfies the predicate, or null if no such item is found.
 */
export async function findOneOccurrence<T extends number, U extends NonNullish>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	items: AsyncGenerator<T, unknown, unknown>
): Promise<T | null> {
	for await (const batch of itemGenerator(items)) {
		const found = await fetchAndFind(predicate, fetcher, batch);
		if (found != null) return found;
	}
	// if no item is found, return null
	return null;
}

/**
 * Finds an occurrence of a target string in a set of items.
 * Perform a randomized sampling with higher frequency,
 * and a fallback search with lower frequency.
 * All items are searched at the end.
 */
async function* itemGenerator<T extends number>(
	items: AsyncGenerator<T, unknown, unknown>,
	samplingRatio = 0.1,
	sampledCount = 50,
	fallbackCount = 1000
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
			yield* batcher(sampledItems);
		}
		if (fallbackItems.length >= fallbackCount) {
			yield* batcher(fallbackItems);
		}
	}
	// yield remaining items
	if (sampledItems.length > 0) {
		yield* batcher(sampledItems, 1);
	}
	if (fallbackItems.length > 0) {
		yield* batcher(fallbackItems, 1);
	}
}

/**
 * Comsumes a buffer of items in ratio and yields them in batches.
 */
const batcher = <T>(
	buffer: T[],
	ratio = 0.5,
	batchSize = 50
): Generator<ReadonlyArray<T>, void, unknown> =>
	batches(
		batchSize,
		buffer.splice(0, buffer.length * ratio) as ReadonlyArray<T>
	);

function* batches<T>(
	batchSize: number,
	array: ReadonlyArray<T>
): Generator<ReadonlyArray<T>, void, unknown> {
	for (let i = 0; i < array.length; i += batchSize) {
		yield array.slice(i, i + batchSize);
	}
}

/**
 * Fetches items in a batch and finds the first item that meets the condition.
 */
async function fetchAndFind<T extends NonNullish, U>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	batch: ReadonlyArray<T>
): Promise<T | null> {
	// Fetch items in parallel and check for condition
	const items = await fetcher(batch);
	// Return an item where the condition is met
	return items.map(predicate).find((rev) => rev != null) ?? null;
}
