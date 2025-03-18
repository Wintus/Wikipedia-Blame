import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	shuffleArray,
	findOneOccurrence,
	batchSearch,
} from '../RevisionFinder';

describe('RevisionFinder', () => {
	// Seed random number generator for consistent testing
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
	});

	describe('shuffleArray', () => {
		it('maintains original array contents', () => {
			const original = [1, 2, 3, 4, 5];
			const shuffled = shuffleArray(original);

			expect(shuffled.sort()).toEqual(original.sort());
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
		it('returns null for empty revisions', async () => {
			const mockFetcher = vi.fn();
			const result = await findOneOccurrence('test', mockFetcher, []);

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

			const revisions = [12345, 67890, 54321];
			const result = await findOneOccurrence('test', mockFetcher, revisions);

			expect(result).toBe(54321);
			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});

		it('returns null when no revision contains target text', async () => {
			const mockFetcher = vi
				.fn()
				.mockResolvedValueOnce([
					{ rev: 12345, text: 'Some text' },
					{ rev: 67890, text: 'Another text' },
				])
				.mockResolvedValueOnce([{ rev: 54321, text: 'More text' }]);

			const revisions = [12345, 67890, 54321];
			const result = await findOneOccurrence('test', mockFetcher, revisions);

			expect(result).toBeNull();
			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});
	});

	describe('batchSearch', () => {
		it('finds revision with target text', async () => {
			const mockFetcher = vi.fn().mockResolvedValue([
				{ rev: 12345, text: 'Some text' },
				{ rev: 67890, text: 'Contains test text' },
			]);

			const revisions = [12345, 67890, 54321, 98765];
			const result = await batchSearch('test', mockFetcher, revisions);

			expect(result).toBe(67890);
			expect(mockFetcher).toHaveBeenCalledWith([12345, 67890, 54321, 98765]);
		});

		it('returns null when no revision contains target text', async () => {
			const mockFetcher = vi.fn().mockResolvedValue([
				{ rev: 12345, text: 'Some text' },
				{ rev: 67890, text: 'Another text' },
			]);

			const revisions = [12345, 67890];
			const result = await batchSearch('test', mockFetcher, revisions);

			expect(result).toBeNull();
			expect(mockFetcher).toHaveBeenCalledWith([12345, 67890]);
		});

		it('processes batches of revisions', async () => {
			const largeRevisions = Array.from({ length: 100 }, (_, i) => i);
			const mockFetcher = vi
				.fn()
				.mockResolvedValueOnce(
					largeRevisions.slice(0, 50).map((rev) => ({ rev, text: 'Some text' }))
				)
				.mockResolvedValueOnce([{ rev: 75, text: 'Contains test text' }]);

			const result = await batchSearch('test', mockFetcher, largeRevisions);

			expect(result).toBe(75);
			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});
	});
});
