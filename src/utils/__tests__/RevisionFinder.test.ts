import { describe, it, expect, vi } from 'vitest';
import {
  shuffleArray,
  findOneOccurrence,
  batchSearch
} from '../RevisionFinder';
import { RevisionResult } from '../../types';

describe('RevisionFinder', () => {
  describe('shuffleArray', () => {
    it('returns a new array without modifying the original', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled).not.toBe(original);
      expect(original).toEqual([1, 2, 3, 4, 5]);
    });

    it('contains the same elements as the original array', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('handles empty arrays', () => {
      const original: number[] = [];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(0);
    });

    it('handles single-element arrays', () => {
      const original = [42];
      const shuffled = shuffleArray(original);

      expect(shuffled).toEqual([42]);
    });
  });

  describe('findOneOccurrence', () => {
    it('returns null for empty revision list', async () => {
      const mockFetcher = vi.fn();
      const result = await findOneOccurrence('test', mockFetcher, []);
      expect(result).toBeNull();
    });

    it('finds occurrence in sampled revisions', async () => {
      const mockFetcher = vi.fn().mockResolvedValue([
        { rev: 1, text: 'no match' },
        { rev: 2, text: 'contains test text' }
      ]);

      const revisions = [1, 2, 3, 4, 5];
      const result = await findOneOccurrence('test text', mockFetcher, revisions);

      expect(result).toBe(2);
    });

    it('falls back to full search when sampling fails', async () => {
      const mockFetcher = vi.fn()
        .mockResolvedValueOnce([
          { rev: 1, text: 'no match' },
          { rev: 2, text: 'no match' }
        ])
        .mockResolvedValueOnce([
          { rev: 3, text: 'contains test text' }
        ]);

      const revisions = [1, 2, 3, 4, 5];
      const result = await findOneOccurrence('test text', mockFetcher, revisions);

      expect(result).toBe(3);
    });
  });

  describe('batchSearch', () => {
    it('returns null when text is not found', async () => {
      const mockFetcher = vi.fn().mockResolvedValue([
        { rev: 1, text: 'no match' },
        { rev: 2, text: 'no match' }
      ]);

      const revisions = [1, 2, 3, 4, 5];
      const result = await batchSearch('test text', mockFetcher, revisions);

      expect(result).toBeNull();
    });

    it('finds text in a batch of revisions', async () => {
      const mockFetcher = vi.fn().mockResolvedValue([
        { rev: 1, text: 'no match' },
        { rev: 2, text: 'contains test text' }
      ]);

      const revisions = [1, 2, 3, 4, 5];
      const result = await batchSearch('test text', mockFetcher, revisions);

      expect(result).toBe(2);
    });

    it('handles empty revision list', async () => {
      const mockFetcher = vi.fn();
      const result = await batchSearch('test text', mockFetcher, []);

      expect(result).toBeNull();
    });

    it('handles large batch of revisions', async () => {
      const largeRevisions = Array.from({ length: 200 }, (_, i) => i);
      const mockFetcher = vi.fn().mockImplementation(async (batch: number[]) => {
        // Simulate finding the text in the last batch
        if (batch.includes(199)) {
          return [{ rev: 199, text: 'contains test text' }];
        }
        return batch.map(rev => ({ rev, text: 'no match' }));
      });

      const result = await batchSearch('test text', mockFetcher, largeRevisions);

      expect(result).toBe(199);
    });
  });
});
