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
 * Yields items in batches.
 */
async function* batchGenerator<T>(
	items: AsyncGenerator<T, unknown, unknown>,
	batchSize = 50
): AsyncGenerator<ReadonlyArray<T>, void, unknown> {
	const buffer: T[] = [];
	for await (const item of items) {
		buffer.push(item);
		if (buffer.length >= batchSize) {
			yield buffer.splice(0, batchSize);
		}
	}
	if (buffer.length > 0) {
		yield buffer;
	}
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi } = import.meta.vitest;

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

			it('searches full list when item contains target text', async () => {
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

	describe('batchGenerator', () => {
		it('should yield items in batches of the specified size', async () => {
			// Arrange
			const items = [1, 2, 3, 4, 5, 6, 7];
			const batchSize = 3;
			const gen = batchGenerator(createAsyncGenerator(items), batchSize);
			// Act
			const result = await Array.fromAsync(gen);
			// Assert
			expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
		});

		it('should yield nothing for an empty input', async () => {
			// Arrange
			const items: number[] = [];
			const batchSize = 3;
			const gen = batchGenerator(createAsyncGenerator(items), batchSize);
			// Act
			const result = await Array.fromAsync(gen);
			// Assert
			expect(result).toEqual([]);
		});

		it('should handle batch size of 1', async () => {
			const items = [1, 2, 3];
			const batchSize = 1;
			const gen = batchGenerator(createAsyncGenerator(items), batchSize);
			// Act
			const result = await Array.fromAsync(gen);
			// Assert
			expect(result).toEqual([[1], [2], [3]]);
		});

		it('should handle batch size of 2 and array length of 5', async () => {
			// Arrange
			const items = [1, 2, 3, 4, 5];
			const batchSize = 2;
			const gen = batchGenerator(createAsyncGenerator(items), batchSize);
			// Act
			const result = await Array.fromAsync(gen);
			// Assert
			expect(result).toEqual([[1, 2], [3, 4], [5]]);
		});
	});

	describe('findOneOccurrence Error Handling', () => {
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
