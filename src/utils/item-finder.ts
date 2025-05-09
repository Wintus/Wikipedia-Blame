// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NonNullish = {};

export type Predicate<S, T extends NonNullish> = (item: S) => T | null;

/**
 * Finds the first occurrence of an item that satisfies a given predicate.
 *
 * @template S - The type of the items in the input generator.
 * @template T - The type of the items returned by the fetcher function.
 * @param predicate - A function that takes an item and returns a value or null if the condition is not met.
 * @param items - An asynchronous generator that provides the items to search through.
 * @returns A promise that resolves to the first item that satisfies the predicate, or null if no such item is found.
 */
export const findOneOccurrence = async <S, T extends NonNullish>(
	predicate: Predicate<S, T>,
	items: AsyncGenerator<S, unknown, unknown>
): Promise<T | null> => genFind(mapGen(predicate, items));

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

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

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

	describe('RevisionFinder', () => {
		describe('findOneOccurrence', () => {
			it('returns null for empty items', async () => {
				// Arrange
				const result = await findOneOccurrence(
					createTextDetector('test'),
					createAsyncGenerator([])
				);
				// Assert
				expect(result).toBeNull();
			});

			it('searches full list when item contains target text', async () => {
				// Arrange
				const items = [
					{ rev: 12345, text: 'Some text' },
					{ rev: 67890, text: 'Another text' },
					{ rev: 54321, text: 'Contains test text' },
				];
				// Act
				const result = await findOneOccurrence(
					createTextDetector('test'),
					createAsyncGenerator(items)
				);
				// Assert
				expect(result).toBe(54321);
			});

			it('returns null when no item contains target text', async () => {
				// Arrange
				const items = [
					{ rev: 12345, text: 'Some text' },
					{ rev: 67890, text: 'Another text' },
					{ rev: 54321, text: 'More text' },
				];
				// Act
				const result = await findOneOccurrence(
					createTextDetector('test'),
					createAsyncGenerator(items)
				);
				// Assert
				expect(result).toBeNull();
			});
		});
	});
}
