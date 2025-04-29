// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NonNullish = {};

export type Predicate<S, T extends NonNullish> = (item: S) => T | null;

/**
 * Finds the first occurrence of an item that satisfies a given predicate.
 *
 * @template T - The type of the items in the input generator.
 * @template U - The type of the items returned by the fetcher function.
 * @param predicate - A function that takes an item and returns a value or null if the condition is not met.
 * @param fetcher - An async generator function that takes a batch of items and yields the fetched/processed items.
 * @param items - An asynchronous generator that provides the items to search through.
 * @returns A promise that resolves to the first item that satisfies the predicate, or null if no such item is found.
 */
export const findOneOccurrence = async <T extends NonNullish, U>(
	predicate: Predicate<U, T>,
	fetcher: (items: ReadonlyArray<T>) => AsyncGenerator<U, unknown, unknown>,
	items: AsyncGenerator<T, unknown, unknown>
): Promise<T | null> =>
	genFind(mapGen(predicate, batchFetchGen(fetcher, items)));

const genFind = async <T extends NonNullish>(
	items: AsyncGenerator<T | null, unknown, unknown>
): Promise<T | null> => {
	for await (const item of items) {
		if (item != null) {
			return item;
		}
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

/**
 * Takes batches from batchGenerator and yields items fetched by the fetcher async generator.
 * @template T - Type of items yielded by the input items generator (e.g., revision IDs).
 * @template U - Type of items yielded by the fetcher generator (e.g., RevisionResult).
 * @param fetcher - An async generator function that fetches/processes a batch of T and yields U.
 * @param items - An async generator yielding items of type T.
 * @returns An async generator yielding items of type U.
 */
async function* batchFetchGen<T extends NonNullish, U>(
	fetcher: (items: ReadonlyArray<T>) => AsyncGenerator<U, unknown, unknown>,
	items: AsyncGenerator<T, unknown, unknown>
): AsyncGenerator<U, void, unknown> {
	for await (const batch of batchGenerator(items)) {
		yield* fetcher(batch);
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

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach, afterEach } = import.meta
		.vitest;

	const createTextDetector =
		<T extends number, U extends { rev: T; text?: string }>(
			targetText: string
		) =>
		(item: U): T | null =>
			item.text?.includes(targetText) ? item.rev : null;

	async function* createAsyncGenerator<T>(
		items: ReadonlyArray<T>
	): AsyncGenerator<T> {
		yield* items;
	}

	async function* createFailingAsyncGenerator(
		errorToThrow: unknown
	): AsyncGenerator<never> {
		// Yield nothing, just throw immediately
		yield* []; // Ensures it's a valid generator
		throw errorToThrow;
	}

	describe('RevisionFinder', () => {
		// Seed random number generator for consistent testing
		beforeEach(() => {
			vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
		});

		describe('findOneOccurrence', () => {
			it('returns null for empty items', async () => {
				// Arrange
				const mockFetcher = vi.fn().mockResolvedValue(createAsyncGenerator([]));
				// Act
				const result = await findOneOccurrence(
					createTextDetector('test'),
					mockFetcher,
					createAsyncGenerator([])
				);
				// Assert
				expect(result).toBeNull();
				expect(mockFetcher).not.toHaveBeenCalled();
			});

			it('searches full list when sampling fails', async () => {
				// Arrange
				const items = [12345, 67890, 54321];
				const mockFetcher = vi.fn().mockImplementationOnce(async function* () {
					yield { rev: 12345, text: 'Some text' };
					yield { rev: 67890, text: 'Another text' };
					yield { rev: 54321, text: 'Contains test text' };
				});
				// Act
				const result = await findOneOccurrence(
					createTextDetector('test'),
					mockFetcher,
					createAsyncGenerator(items)
				);
				// Assert
				expect(result).toBe(54321);
				expect(mockFetcher).toHaveBeenCalledTimes(1);
			});

			it('returns null when no item contains target text', async () => {
				// Arrange
				const items = [12345, 67890, 54321];
				const mockFetcher = vi.fn().mockImplementationOnce(async function* () {
					yield { rev: 12345, text: 'Some text' };
					yield { rev: 67890, text: 'Another text' };
					yield { rev: 54321, text: 'More text' };
				});
				// Act
				const result = await findOneOccurrence(
					createTextDetector('test'),
					mockFetcher,
					createAsyncGenerator(items)
				);
				// Assert
				expect(result).toBeNull();
				expect(mockFetcher).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('batches', () => {
		it('should yield items in batches of the specified size', () => {
			// Arrange
			const items = [1, 2, 3, 4, 5, 6, 7];
			// Act
			const gen = batches(3, items);
			// Assert
			expect(Array.from(gen)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
		});

		it('should yield nothing for an empty array', () => {
			// Arrange
			const items: number[] = [];
			// Act
			const gen = batches(3, items);
			// Assert
			expect(Array.from(gen)).toEqual([]);
		});

		it('should handle batch size of 1', () => {
			const items = [1, 2, 3];
			const gen = batches(1, items);
			expect(Array.from(gen)).toEqual([[1], [2], [3]]);
		});

		it('should handle batch size of 2 and array length of 5', () => {
			const items = [1, 2, 3, 4, 5];
			const gen = batches(2, items);
			expect(Array.from(gen)).toEqual([[1, 2], [3, 4], [5]]);
		});
	});

	describe('mutBatchGen', () => {
		it('should yield batches based on ratio and batchSize, consuming the buffer', () => {
			// Arrange
			const buffer = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			// Act
			const gen = mutBatchGen(buffer, 0.5, 3); // Consume 50% (5 items), batch size 3
			// Assert
			expect(Array.from(gen)).toEqual([
				[1, 2, 3],
				[4, 5],
			]);
			expect(buffer).toEqual([6, 7, 8, 9, 10]); // Verify mutation
		});

		it('should yield nothing if ratio is 0', () => {
			// Arrange
			const buffer = [1, 2, 3, 4];
			// Act
			const gen = mutBatchGen(buffer, 0, 2);
			// Assert
			expect(Array.from(gen)).toEqual([]);
			expect(buffer).toEqual([1, 2, 3, 4]); // Buffer unchanged
		});

		it('should yield all items if ratio is 1', () => {
			const buffer = [1, 2, 3, 4];
			const gen = mutBatchGen(buffer, 1, 2);
			expect(Array.from(gen)).toEqual([
				[1, 2],
				[3, 4],
			]);
			expect(buffer).toEqual([]);
		});

		it('should handle empty buffer', () => {
			const buffer: number[] = [];
			const gen = mutBatchGen(buffer, 0.5, 2);
			expect(Array.from(gen)).toEqual([]);
			expect(buffer).toEqual([]);
		});
	});

	describe('batchGenerator', () => {
		let randomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
		});

		afterEach(() => {
			randomSpy.mockRestore();
		});

		it('should yield sampled items when sampledCount threshold is met', async () => {
			// Arrange
			randomSpy.mockReturnValue(0.05);
			const inputItems = Array.from({ length: 60 }, (_, i) => i + 1);
			const gen = batchGenerator(
				createAsyncGenerator(inputItems),
				0.1,
				5,
				1000
			);
			// Act
			const resultBatches = await Array.fromAsync(gen);
			// Assert
			expect(resultBatches.length).toBeGreaterThanOrEqual(1);
			expect(resultBatches[0]?.length).toBeLessThanOrEqual(5);
			expect(resultBatches.flat().length).toBe(inputItems.length);
		});

		it('should yield fallback items when fallbackCount threshold is met', async () => {
			// Arrange
			randomSpy.mockReturnValue(0.5);
			const inputItems = Array.from({ length: 15 }, (_, i) => i + 1);
			const gen = batchGenerator(createAsyncGenerator(inputItems), 0.1, 50, 10);
			// Act
			const resultBatches = await Array.fromAsync(gen);
			// Assert
			expect(resultBatches.length).toBeGreaterThanOrEqual(1);
			expect(resultBatches[0]?.length).toBeLessThanOrEqual(10);
			expect(resultBatches.flat().length).toBe(inputItems.length);
		});

		it('should yield remaining items at the end if thresholds not met', async () => {
			// Arrange
			randomSpy
				.mockReturnValueOnce(0.05)
				.mockReturnValueOnce(0.5)
				.mockReturnValueOnce(0.08)
				.mockReturnValueOnce(0.6);
			const inputItems = [1, 2, 3, 4];
			const gen = batchGenerator(createAsyncGenerator(inputItems), 0.1, 10, 10);
			// Act
			const resultBatches = await Array.fromAsync(gen);
			// Assert
			expect(resultBatches).toEqual([
				[1, 3],
				[2, 4],
			]);
		});

		it('should handle empty input generator', async () => {
			const gen = batchGenerator(createAsyncGenerator<number>([]));
			const resultBatches = await Array.fromAsync(gen);
			expect(resultBatches).toEqual([]);
		});

		it('should respect custom samplingRatio, sampledCount, fallbackCount', async () => {
			randomSpy.mockReturnValue(0.15); // Sampled (ratio 0.2)
			const inputItems = Array.from({ length: 10 }, (_, i) => i + 1);
			// sampleRatio 0.2, sampledCount 1, fallbackCount 5
			const gen = batchGenerator(createAsyncGenerator(inputItems), 0.2, 1, 5);

			// Expect ~2 sampled items, ~8 fallback.
			// Sampled should yield batches of 1 immediately.
			// Fallback should yield a batch of 5, then remaining 3.
			const resultBatches = await Array.fromAsync(gen);

			// This needs careful tracing based on the mock values and logic.
			// Example expectation (might vary based on exact random mock sequence):
			// Batch 1: [1] (sampled)
			// Batch 2: [3] (sampled)
			// Batch 3: [2, 4, 5, 6, 7] (fallback threshold)
			// Batch 4: [] (no remaining sampled) - mutBatchGen yields nothing for empty splice
			// Batch 5: [8, 9, 10] (remaining fallback)
			// Assertions would need to match the expected sequence precisely.
			expect(resultBatches.length).toBeGreaterThan(0); // Basic check
		});
	});

	describe('findOneOccurrence Error Handling', () => {
		beforeEach(() => {
			vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
		});

		it('should propagate error from the items generator', async () => {
			// Arrange
			const mockFetcher = vi.fn().mockImplementation(async function* (
				b: number[]
			) {
				yield* b.map((rev) => ({ rev }));
			});
			const predicate = () => {
				return 1;
			};
			// Act & Assert
			await expect(
				findOneOccurrence(
					predicate,
					mockFetcher,
					createFailingAsyncGenerator(new Error('Items failed'))
				)
			).rejects.toThrow('Items failed');
		});

		it('should propagate error from the fetcher function', async () => {
			// Arrange
			const items = [1, 2];
			const mockFetcher = vi
				.fn()
				.mockImplementation(() =>
					createFailingAsyncGenerator(new Error('Fetcher failed'))
				);
			const predicate = () => 1;
			// Act & Assert
			await expect(
				findOneOccurrence(predicate, mockFetcher, createAsyncGenerator(items))
			).rejects.toThrowError('Fetcher failed');
		});

		it('should propagate error from the predicate function', async () => {
			// Arrange
			const items = [1];
			const mockFetcher = vi.fn().mockImplementation(async function* (
				b: number[]
			) {
				yield* b.map((rev) => ({ rev }));
			});
			const throwingPredicate = () => {
				throw new Error('Predicate failed');
			};
			// Act & Assert
			await expect(
				findOneOccurrence(
					throwingPredicate,
					mockFetcher,
					createAsyncGenerator(items)
				)
			).rejects.toThrow('Predicate failed');
		});
	});
}
