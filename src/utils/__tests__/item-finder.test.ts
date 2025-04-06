import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	shuffleArray,
	findOneOccurrence,
	batchSearch,
	createTextDetector,
} from '../item-finder';

describe('RevisionFinder', () => {
	// Seed random number generator for consistent testing
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
	});

	describe('shuffleArray', () => {
		it('maintains original array contents', () => {
			const original = [1, 2, 3, 4, 5];
			const shuffled = shuffleArray(original) as number[];

			expect(shuffled.toSorted()).toEqual(original.sort());
		});

		it('returns a new array reference', () => {
			const original = [1, 2, 3, 4, 5];
			const shuffled = shuffleArray(original);

			expect(shuffled).not.toBe(original);
		});

		it('handles edge cases', () => {
			const emptyArray: number[] = [];
			const singleElementArray = [42];

			expect(shuffleArray(emptyArray)).toEqual([]);
			expect(shuffleArray(singleElementArray)).toEqual([42]);
		});
	});

	describe('findOneOccurrence', () => {
		it('returns null for empty items', async () => {
			const mockFetcher = vi.fn();
			const result = await findOneOccurrence(
				createTextDetector('test'),
				mockFetcher,
				[]
			);

			expect(result).toBeNull();
			expect(mockFetcher).not.toHaveBeenCalled();
		});

		it('searches full list when sampling fails', async () => {
			const mockFetcher = vi
				.fn()
				.mockResolvedValueOnce([
					{ rev: 12345, text: 'Some text' },
					{ rev: 67890, text: 'Another text' },
				])
				.mockResolvedValueOnce([{ rev: 54321, text: 'Contains test text' }]);

			const items = [12345, 67890, 54321];
			const result = await findOneOccurrence(
				createTextDetector('test'),
				mockFetcher,
				items
			);

			expect(result).toBe(54321);
			expect(mockFetcher).toHaveBeenCalledTimes(2);
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
				items
			);

			expect(result).toBeNull();
			expect(mockFetcher).toHaveBeenCalledTimes(2);
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
