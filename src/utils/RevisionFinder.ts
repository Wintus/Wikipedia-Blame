import { getRevisionTexts } from '../services/WikipediaAPI';
import { WikiLanguage } from '../types';

/**
 * Fisher-Yates shuffle (non-destructive shuffle)
 */
export function shuffleArray<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
	const shuffled = [...array]; // Shallow copy to avoid modifying the original array
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Finds an occurrence of a target string in a set of revisions.
 * Starts with a randomized sampling approach, then falls back to a full batch search if necessary.
 */
export async function findOneOccurrence(
	targetText: string,
	revList: ReadonlyArray<number>,
	lang: WikiLanguage = 'en'
): Promise<number | null> {
	if (revList.length === 0) return null;

	// Randomized sampling: 10% of the list or at least 5 revisions
	const sampleSize = Math.max(5, Math.floor(revList.length * 0.1));
	const sampledRevs = shuffleArray(revList).slice(0, sampleSize);

	// Fetch revisions in parallel and check for target text
	const revisionResults = await getRevisionTexts(sampledRevs, lang);
	const results = revisionResults.map(async ({ rev, text }) => {
		return text?.includes(targetText) ? rev : null;
	});

	// Return a revision where the target text appears
	const found = results.find((rev) => rev !== null);
	if (found) return found;

	// If not found in the sample, proceed with exhaustive search
	return await exhaustiveSearch(revList, targetText, lang);
}

/**
 * Performs an exhaustive search by fetching revisions in batches of 50.
 * Used as a fallback if randomized sampling does not find the target text.
 */
export async function exhaustiveSearch(
	revList: ReadonlyArray<number>,
	targetText: string,
	lang: WikiLanguage = 'en'
): Promise<number | null> {
	const batchSize = 50;
	for (let i = 0; i < revList.length; i += batchSize) {
		const batch = revList.slice(i, i + batchSize);
		const revisionResults = await getRevisionTexts(batch, lang);
		const results = revisionResults.map(async ({ rev, text }) => {
			return text?.includes(targetText) ? rev : null;
		});

		const found = results.find((rev) => rev !== null);
		if (found) return found;
	}
	return null;
}
