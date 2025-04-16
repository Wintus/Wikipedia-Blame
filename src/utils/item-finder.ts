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
export const findOneOccurrence = async <T extends NonNullish, U>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	items: AsyncGenerator<T, unknown, unknown>
): Promise<T | null> =>
	genFind(mapGen(predicate, batchFetchGen(fetcher, items)));

const genFind = async <T extends NonNullish>(
	items: AsyncGenerator<T | null, unknown, unknown>
): Promise<T | null> => {
	for await (const item of items) {
		if (item != null) return item;
	}
	// if no item is found, return null
	return null;
};

async function* mapGen<T, U>(
	functor: (item: T) => U,
	items: AsyncGenerator<T, unknown, unknown>
): AsyncGenerator<U, void, unknown> {
	for await (const item of items) {
		yield functor(item);
	}
}

async function* batchFetchGen<T extends NonNullish, U>(
	fetcher: (items: ReadonlyArray<T>) => Promise<ReadonlyArray<U>>,
	items: AsyncGenerator<T, unknown, unknown>
): AsyncGenerator<U, void, unknown> {
	for await (const batch of batchGenerator(items)) {
		yield* await fetcher(batch);
	}
}

/**
 * Finds an occurrence of a target string in a set of items.
 * Perform a randomized sampling with higher frequency,
 * and a fallback search with lower frequency.
 * All items are searched at the end.
 */
async function* batchGenerator<T>(
	items: AsyncGenerator<T, unknown, unknown>,
	samplingRatio = 0.1,
	sampledCount = 50,
	fallbackCount = 1000
): AsyncGenerator<ReadonlyArray<T>, void, unknown> {
	// Buffers are intentionally mutable (T[]) as they are consumed by mutBatchGen via splice.
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
			yield* mutBatchGen(sampledItems, 0.5);
		}
		if (fallbackItems.length >= fallbackCount) {
			yield* mutBatchGen(fallbackItems, 0.5);
		}
	}
	// yield remaining items
	if (sampledItems.length > 0) {
		yield* mutBatchGen(sampledItems, 1);
	}
	if (fallbackItems.length > 0) {
		yield* mutBatchGen(fallbackItems, 1);
	}
}

/**
 * consumes a buffer of items in ratio and yields them in batches.
 */
const mutBatchGen = <T>(
	buffer: T[],
	ratio = 1.0,
	batchSize = 50
): Generator<ReadonlyArray<T>, void, unknown> =>
	batches(batchSize, buffer.splice(0, buffer.length * ratio));

function* batches<T>(
	batchSize: number,
	array: ReadonlyArray<T>
): Generator<ReadonlyArray<T>, void, unknown> {
	for (let i = 0; i < array.length; i += batchSize) {
		yield array.slice(i, i + batchSize);
	}
}
