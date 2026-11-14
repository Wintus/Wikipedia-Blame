type NonNullish = NonNullable<unknown>;

export type PartialMapper<S, T extends NonNullish> = (item: S) => T | null;

/**
 * Finds the first item for which the mapper returns a non-null value.
 *
 * @template S - The type of the items in the input generator.
 * @template T - The non-nullish type returned by the mapper if an item matches.
 * @param mapper - A function that takes an item of type S and returns a value of type T or null if the item does not match.
 * @param items - An asynchronous generator that provides items of type S to search through.
 * @returns A promise that resolves to the first mapped value of type T, or null if no item matches.
 */
export const findMap = async <S, T extends NonNullish>(
	mapper: PartialMapper<S, T>,
	items: AsyncGenerator<S, unknown, unknown>,
): Promise<T | null> => find(map(mapper, items));

const find = async <T extends NonNullish>(
	items: AsyncGenerator<T | null, unknown, unknown>,
): Promise<T | null> => {
	for await (const item of items) {
		if (item != null) {
			return item;
		}
	}
	// if no item is found, return null
	return null;
};

async function* map<T, U>(
	mapper: (item: T) => U,
	items: AsyncGenerator<T, unknown, unknown>,
): AsyncGenerator<U, void, unknown> {
	for await (const item of items) {
		yield mapper(item);
	}
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	const createTextDetector =
		<T extends number, U extends { rev: T; text?: string }>(
			targetText: string,
		): PartialMapper<U, T> =>
		(item) =>
			item.text?.includes(targetText) ? item.rev : null;

	async function* createAsyncGenerator<T>(
		items: ReadonlyArray<T>,
	): AsyncGenerator<T> {
		yield* items;
	}

	describe('findMap', () => {
		it('returns null for empty items', async () => {
			// Arrange
			const result = await findMap(
				createTextDetector('test'),
				createAsyncGenerator([]),
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
			const result = await findMap(
				createTextDetector('test'),
				createAsyncGenerator(items),
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
			const result = await findMap(
				createTextDetector('test'),
				createAsyncGenerator(items),
			);
			// Assert
			expect(result).toBeNull();
		});
	});
}
