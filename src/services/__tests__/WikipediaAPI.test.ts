import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getBaseUrl,
	fetchPageId,
	fetchRevisionTexts,
	fetchAllRevisions,
} from '../WikipediaAPI';
import { RevisionResult } from '../../types';

describe('WikipediaAPI', () => {
	const originalFetch = global.fetch;
	const baseUrl = 'https://en.wikipedia.org';

	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe('getBaseUrl', () => {
		it('generates correct base URL for different languages', () => {
			expect(getBaseUrl('en')).toBe('https://en.wikipedia.org');
			expect(getBaseUrl('ja')).toBe('https://ja.wikipedia.org');
		});
	});

	describe('fetchPageId', () => {
		it('returns page ID for successful request', async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ id: 12345 }),
			};

			(global.fetch as vi.Mock).mockResolvedValue(mockResponse);

			const result = await fetchPageId(baseUrl, 'Test Page');
			expect(result).toBe(12345);
		});

		it('returns null for unsuccessful request', async () => {
			const mockResponse = {
				ok: false,
			};

			(global.fetch as vi.Mock).mockResolvedValue(mockResponse);

			const result = await fetchPageId(baseUrl, 'Test Page');
			expect(result).toBeNull();
		});

		it('returns null on network error', async () => {
			(global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

			const result = await fetchPageId(baseUrl, 'Test Page');
			expect(result).toBeNull();
		});
	});

	describe('fetchRevisionTexts', () => {
		it('fetches multiple revision texts', async () => {
			const mockResponse = {
				json: vi.fn().mockResolvedValue({
					query: {
						pages: [
							{
								revisions: [
									{
										revid: 1,
										slots: { main: { content: 'First revision' } },
									},
									{
										revid: 2,
										slots: { main: { content: 'Second revision' } },
									},
								],
							},
						],
					},
				}),
			};

			(global.fetch as vi.Mock).mockResolvedValue(mockResponse);

			const result = await fetchRevisionTexts(baseUrl, [1, 2]);
			expect(result).toEqual([
				{ rev: 1, text: 'First revision' },
				{ rev: 2, text: 'Second revision' },
			]);
		});

		it('throws error when more than 50 revision IDs are provided', async () => {
			const largeRevisionList = Array.from({ length: 51 }, (_, i) => i);

			await expect(
				fetchRevisionTexts(baseUrl, largeRevisionList)
			).rejects.toThrow('The number of revision IDs cannot exceed 50');
		});

		it('returns empty array on network error', async () => {
			(global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

			const result = await fetchRevisionTexts(baseUrl, [1, 2]);
			expect(result).toEqual([]);
		});
	});

	describe('fetchAllRevisions', () => {
		it('fetches all revisions with pagination', async () => {
			const mockResponses = [
				{
					json: vi.fn().mockResolvedValue({
						query: {
							pages: [
								{
									revisions: [{ revid: 1 }, { revid: 2 }],
								},
							],
						},
						continue: { rvcontinue: 'continue-token' },
					}),
				},
				{
					json: vi.fn().mockResolvedValue({
						query: {
							pages: [
								{
									revisions: [{ revid: 3 }, { revid: 4 }],
								},
							],
						},
					}),
				},
			];

			(global.fetch as vi.Mock)
				.mockResolvedValueOnce(mockResponses[0])
				.mockResolvedValueOnce(mockResponses[1]);

			const result = await fetchAllRevisions(baseUrl, 12345);
			expect(result).toEqual([1, 2, 3, 4]);
		});

		it('returns empty array on network error', async () => {
			(global.fetch as vi.Mock).mockRejectedValue(new Error('Network error'));

			const result = await fetchAllRevisions(baseUrl, 12345);
			expect(result).toEqual([]);
		});
	});
});
