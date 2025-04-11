import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findOneOccurrence, batchSearch } from '../item-finder';

const createTextDetector =
	<T extends number, U extends { rev: T; text?: string }>(targetText: string) =>
	(item: U): T | null =>
		item.text?.includes(targetText) ? item.rev : null;

async function* createAsyncGenerator<T>(
	items: ReadonlyArray<T>
): AsyncGenerator<T> {
	for (const item of items) {
		yield item;
	}
}

describe('RevisionFinder', () => {
	// Seed random number generator for consistent testing
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
	});

	describe('findOneOccurrence', () => {
		it('returns null for empty items', async () => {
			const mockFetcher = vi.fn();
			const result = await findOneOccurrence(
				createTextDetector('test'),
				mockFetcher,
				createAsyncGenerator([])
			);

			expect(result).toBeNull();
			expect(mockFetcher).not.toHaveBeenCalled();
		});

		it('searches full list when sampling fails', async () => {
			const mockFetcher = vi.fn().mockResolvedValueOnce([
				{ rev: 12345, text: 'Some text' },
				{ rev: 67890, text: 'Another text' },
				{ rev: 54321, text: 'Contains test text' },
			]);

			const items = [12345, 67890, 54321];
			const result = await findOneOccurrence(
				createTextDetector('test'),
				mockFetcher,
				createAsyncGenerator(items)
			);

			expect(result).toBe(54321);
			expect(mockFetcher).toHaveBeenCalledTimes(1);
		});

		it('returns null when no item contains target text', async () => {
			const mockFetcher = vi
				.fn()
				.mockResolvedValueOnce([
					{ rev: 12345, text: 'Some text' },
					{ rev: 67890, text: 'Another text' },
				])
				.mockResolvedValueOnce([{ rev: 54321, text: 'More text' }]);

			const items = [12345, 67890, 54321];
			const result = await findOneOccurrence(
				createTextDetector('test'),
				mockFetcher,
				createAsyncGenerator(items)
			);

			expect(result).toBeNull();
			expect(mockFetcher).toHaveBeenCalledTimes(1);
		});
	});

	describe('batchSearch', () => {
		it('finds item with target text', async () => {
			const mockFetcher = vi.fn().mockResolvedValue([
				{ rev: 12345, text: 'Some text' },
				{ rev: 67890, text: 'Contains test text' },
			]);

			const items = [12345, 67890, 54321, 98765];
			const result = await batchSearch(
				createTextDetector('test'),
				mockFetcher,
				items
			);

			expect(result).toBe(67890);
			expect(mockFetcher).toHaveBeenCalledWith([12345, 67890, 54321, 98765]);
		});

		it('returns null when no item contains target text', async () => {
			const mockFetcher = vi.fn().mockResolvedValue([
				{ rev: 12345, text: 'Some text' },
				{ rev: 67890, text: 'Another text' },
			]);

			const items = [12345, 67890];
			const result = await batchSearch(
				createTextDetector('test'),
				mockFetcher,
				items
			);

			expect(result).toBeNull();
			expect(mockFetcher).toHaveBeenCalledWith([12345, 67890]);
		});

		it('processes batches of items', async () => {
			const largeItems = Array.from({ length: 100 }, (_, i) => i);
			const mockFetcher = vi
				.fn()
				.mockResolvedValueOnce(
					largeItems.slice(0, 50).map((rev) => ({ rev, text: 'Some text' }))
				)
				.mockResolvedValueOnce([{ rev: 75, text: 'Contains test text' }]);

			const result = await batchSearch(
				createTextDetector('test'),
				mockFetcher,
				largeItems
			);

			expect(result).toBe(75);
			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});
	});
});
