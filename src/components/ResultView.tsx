import { type SearchState } from '../wiki';

type ResultViewProps = {
	result: SearchState;
	isPending?: boolean;
};

/**
 * Gets the URL for a specific revision
 */
const getRevisionUrl = (wikiUrl: URL | string, revId: number): URL =>
	new URL(`/w/index.php?oldid=${revId}`, wikiUrl);

export function ResultView({ result, isPending }: ResultViewProps) {
	// guard
	if (isPending) {
		return <div className="result-view loading">Searching...</div>;
	} else if (result.error) {
		return <div className="result-view error">{result.error}</div>;
	} else if (result.revisionId == null) {
		return (
			<div className="result-view not-found">
				Text not found in the article's revision history.
			</div>
		);
	}

	const revisionUrl = getRevisionUrl(
		result.wiki.url,
		result.revisionId
	).toString();

	return (
		<div className="result-view success">
			<h3>An Occurrence Found</h3>
			<div className="result-details">
				<p>
					<strong>Article:</strong> {result.pageTitle.trim()}
				</p>
				<p>
					<strong>Text:</strong> "{result.targetText}"
				</p>
				<p>
					<strong>Revision ID:</strong> {result.revisionId}
				</p>
				<a
					href={revisionUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="revision-link"
				>
					View Revision
				</a>
			</div>
		</div>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = await import('vitest');
	const { render, screen } = await import('@testing-library/react');
	const { WIKI_SITES } = await import('../wiki');

	describe('ResultView', () => {
		const createResult = (
			overrides: Partial<SearchState> = {}
		): SearchState => ({
			wiki: WIKI_SITES.ENWP,
			pageId: null,
			pageTitle: '',
			targetText: '',
			revisionId: null,
			error: null,
			searchCount: 0,
			order: 'asc' as const,
			...overrides,
		});

		it('displays pending state when isPending is true', () => {
			const result = createResult();
			render(<ResultView result={result} isPending={true} />);

			expect(screen.getByText(/searching/i)).toBeTruthy();
		});

		it('prioritizes isPending over loading state', () => {
			const loadingResult = createResult();
			render(<ResultView result={loadingResult} isPending={false} />);

			expect(screen.queryByText(/searching/i)).toBeNull();
		});

		it('displays error state', () => {
			const errorResult = createResult({ error: 'Test error message' });
			render(<ResultView result={errorResult} />);

			expect(screen.getByText(/test error message/i)).toBeTruthy();
		});

		it('displays not found state', () => {
			const notFoundResult = createResult({
				pageTitle: 'Test Page',
				targetText: 'Test Text',
			});
			render(<ResultView result={notFoundResult} />);

			expect(screen.getByText(/text not found/i)).toBeTruthy();
		});

		it('displays successful result with full details', () => {
			const successResult = createResult({
				revisionId: 12345,
				pageTitle: 'Test Article',
				targetText: 'Test Text',
			});
			render(<ResultView result={successResult} />);

			expect(screen.getByText(/an occurrence found/i)).toBeTruthy();
			expect(screen.getByText(/test article/i)).toBeTruthy();
			expect(screen.getByText(/"test text"/i)).toBeTruthy();
			expect(screen.getByText(/12345/)).toBeTruthy();
		});

		it('renders revision link', () => {
			const successResult = createResult({
				revisionId: 12345,
				pageTitle: 'Test Article',
				targetText: 'Test Text',
			});
			render(<ResultView result={successResult} />);

			const revisionLink = screen.getByText(/view revision/i);
			expect(revisionLink).toBeTruthy();
			expect(revisionLink.getAttribute('href')).toBe(
				'https://en.wikipedia.org/w/index.php?oldid=12345'
			);
		});

		it('handles case when no revision link is available', () => {
			const resultWithoutRevision = createResult({
				pageTitle: 'Test Article',
				targetText: 'Test Text',
				revisionId: null,
			});
			render(<ResultView result={resultWithoutRevision} />);

			expect(screen.getByText(/text not found/i)).toBeTruthy();
		});
	});
}
