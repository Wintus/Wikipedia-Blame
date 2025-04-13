import { type SearchState } from '../state';

type ResultViewProps = {
	result: SearchState;
	isPending?: boolean;
};

/**
 * Gets the URL for a specific revision.
 * Links to the previous or next revision based on the order.
 */
const getRevisionUrl = (
	wikiUrl: URL | string,
	revId: number,
	order?: 'asc' | 'desc'
): URL => {
	const url = new URL('/w/index.php', wikiUrl);
	url.searchParams.set('oldid', revId.toString());
	if (order) {
		url.searchParams.set('diff', order === 'asc' ? 'prev' : 'next');
	}
	return url;
};

export function ResultView({ result, isPending }: ResultViewProps) {
	// guard
	if (isPending) {
		return <div className="result-view loading">Searching...</div>;
	} else if (result.searchCount === 0) {
		// No search performed yet. Show nothing.
		return <div className="result-view empty"></div>;
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
		result.wikiUrl,
		result.revisionId,
		result.order
	);

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
					href={revisionUrl.toString()}
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
	const { describe, it, expect } = import.meta.vitest;
	const { render, screen } = await import('@testing-library/react');

	describe('ResultView', () => {
		const createResult = (
			overrides: Partial<SearchState> = {}
		): SearchState => ({
			wikiUrl: new URL('https://en.wikipedia.org'),
			pageId: null,
			pageTitle: '',
			targetText: '',
			revisionId: null,
			error: null,
			searchCount: 1,
			order: 'asc' as const,
			...overrides,
		});

		it('displays pending state when isPending is true', () => {
			const result = createResult();
			render(<ResultView result={result} isPending={true} />);

			expect(screen.getByText(/searching/i)).toBeTruthy();
		});

		it('displays nothing when no search performed yet', () => {
			const initState = createResult({
				searchCount: 0,
			});
			render(<ResultView result={initState} isPending={false} />);

			expect(screen.queryByText(/searching|found/i)).toBeNull();
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
				'https://en.wikipedia.org/w/index.php?oldid=12345&diff=prev'
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
