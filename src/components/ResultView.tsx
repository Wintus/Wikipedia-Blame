import { type SearchState } from '../state';

type Props = {
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
	order?: 'asc' | 'desc',
): URL => {
	const url = new URL('/w/index.php', wikiUrl);
	url.searchParams.set('oldid', revId.toString());
	if (order) {
		url.searchParams.set('diff', order === 'asc' ? 'prev' : 'next');
	}
	return url;
};

export function ResultView({ result, isPending }: Props) {
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
		result.wikiUrl,
		result.revisionId,
		result.order,
	);

	return (
		<div className="result-view success">
			<h2>An Occurrence Found</h2>
			<dl className="result-details">
				<dt>Article</dt>
				<dd>{result.pageTitle.trim()}</dd>
				<dt>Text</dt>
				<dd>
					<q>{result.targetText}</q>
				</dd>
				<dt>Revision ID</dt>
				<dd>{result.revisionId}</dd>
			</dl>
			<a
				href={revisionUrl.toString()}
				target="_blank"
				rel="noopener noreferrer"
				className="revision-link"
			>
				View Revision
			</a>
		</div>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { render, screen } = await import('@testing-library/react');

	describe('ResultView', () => {
		const createResult = (
			overrides: Partial<SearchState> = {},
		): SearchState => ({
			wikiUrl: new URL('https://en.wikipedia.org'),
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

			expect(
				screen.getByRole('heading', {
					level: 2,
					name: /an occurrence found/i,
				}),
			).toBeTruthy();
			expect(screen.getByText(/test article/i)).toBeTruthy();
			expect(screen.getByText('Test Text').closest('q')).not.toBeNull();
			expect(screen.getByText(/12345/)).toBeTruthy();
		});

		it('renders the details as a definition list', () => {
			const successResult = createResult({
				revisionId: 12345,
				pageTitle: 'Test Article',
				targetText: 'Test Text',
			});
			const { container } = render(<ResultView result={successResult} />);

			const details = container.querySelector('dl.result-details');
			expect(details).not.toBeNull();

			const terms = screen.getAllByRole('term');
			const definitions = screen.getAllByRole('definition');

			expect(terms.map((term) => term.textContent)).toEqual([
				'Article',
				'Text',
				'Revision ID',
			]);
			expect(definitions).toHaveLength(3);
			expect(definitions[0]?.closest('dl')).toBe(details);
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
				'https://en.wikipedia.org/w/index.php?oldid=12345&diff=prev',
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
