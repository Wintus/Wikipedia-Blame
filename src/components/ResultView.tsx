import { type SearchState } from '../state';

type Props = {
	state: SearchState;
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

/**
 * True until a search has produced a state to display.
 */
const neverSearched = (state: SearchState): boolean => state.searchCount === 0;

/**
 * Renders the card for the current search state, or nothing before the
 * first search.
 */
export function ResultView({ state, isPending }: Props) {
	// guard
	if (isPending) {
		return <div className="result-view loading">Searching...</div>;
	} else if (neverSearched(state)) {
		// No search has been performed yet.
		return null;
	} else if (state.error) {
		return <div className="result-view error">{state.error}</div>;
	} else if (state.revisionId == null) {
		return (
			<div className="result-view not-found">
				Text not found in the article's revision history.
			</div>
		);
	}

	const revisionUrl = getRevisionUrl(
		state.wikiUrl,
		state.revisionId,
		state.order,
	);

	return (
		<div className="result-view success">
			<h2>An Occurrence Found</h2>
			<dl className="result-details">
				<dt>Article</dt>
				<dd>{state.pageTitle.trim()}</dd>
				<dt>Text</dt>
				<dd>
					<q>{state.targetText}</q>
				</dd>
				<dt>Revision ID</dt>
				<dd>{state.revisionId}</dd>
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
		const createState = (
			overrides: Partial<SearchState> = {},
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

		it('renders nothing before the first search', () => {
			const { container } = render(
				<ResultView state={createState({ searchCount: 0 })} />,
			);

			expect(container).toBeEmptyDOMElement();
		});

		it('displays pending state when isPending is true', () => {
			render(<ResultView state={createState()} isPending={true} />);

			expect(screen.getByText(/searching/i)).toBeTruthy();
		});

		it('prioritizes isPending over the result state', () => {
			const successState = createState({
				revisionId: 12345,
				pageTitle: 'Test Article',
				targetText: 'Test Text',
			});
			render(<ResultView state={successState} isPending={true} />);

			expect(screen.getByText(/searching/i)).toBeTruthy();
			expect(screen.queryByText(/an occurrence found/i)).toBeNull();
		});

		it('displays error state', () => {
			const errorState = createState({ error: 'Test error message' });
			render(<ResultView state={errorState} />);

			expect(screen.getByText(/test error message/i)).toBeTruthy();
		});

		it('displays not found state', () => {
			const notFoundState = createState({
				pageTitle: 'Test Page',
				targetText: 'Test Text',
			});
			render(<ResultView state={notFoundState} />);

			expect(screen.getByText(/text not found/i)).toBeTruthy();
		});

		it('displays successful result with full details', () => {
			const successState = createState({
				revisionId: 12345,
				pageTitle: 'Test Article',
				targetText: 'Test Text',
			});
			render(<ResultView state={successState} />);

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
			const successState = createState({
				revisionId: 12345,
				pageTitle: 'Test Article',
				targetText: 'Test Text',
			});
			const { container } = render(<ResultView state={successState} />);

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
			const successState = createState({
				revisionId: 12345,
				pageTitle: 'Test Article',
				targetText: 'Test Text',
			});
			render(<ResultView state={successState} />);

			const revisionLink = screen.getByText(/view revision/i);
			expect(revisionLink).toBeTruthy();
			expect(revisionLink.getAttribute('href')).toBe(
				'https://en.wikipedia.org/w/index.php?oldid=12345&diff=prev',
			);
		});

		it('handles case when no revision link is available', () => {
			const stateWithoutRevision = createState({
				pageTitle: 'Test Article',
				targetText: 'Test Text',
				revisionId: null,
			});
			render(<ResultView state={stateWithoutRevision} />);

			expect(screen.getByText(/text not found/i)).toBeTruthy();
		});
	});
}
