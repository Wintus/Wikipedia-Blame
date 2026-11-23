import {
	type InitialState,
	type OutcomeState,
	type QueryState,
	type ResultViewState,
} from '../state';

type Props = {
	state: ResultViewState;
	isPending?: boolean;
};

/**
 * Gets the URL for a specific revision.
 * `oldid` selects the revision; `diff=prev` (ascending) shows the change that
 * introduced the found text, `diff=next` (descending) the change that removed
 * it.
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
 * Keeps the status switch exhaustive: adding a status without a case becomes a
 * type error.
 */
const assertNever = (value: never): never => {
	throw new Error(`Unhandled search status: ${String(value)}`);
};

/**
 * Renders the card for the current search state, or nothing before the
 * first search.
 */
function ResultContent({ state, isPending }: Props) {
	// guard
	if (isPending) {
		return <div className="result-view loading">Searching...</div>;
	}

	switch (state.status) {
		case 'initial':
			return null;
		case 'error':
			return <div className="result-view error">{state.message}</div>;
		case 'not-found':
			return (
				<div className="result-view not-found">
					Text not found in the article's revision history.
				</div>
			);
		case 'found': {
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
		default:
			return assertNever(state);
	}
}

/**
 * Displays the outcome of a search and owns the "no search yet" state, so it
 * stays mounted from the start. The container is a status region: it exists
 * before any result, so screen readers announce the card when it changes.
 */
export function ResultView({ state, isPending = false }: Props) {
	return (
		<div className="result-view-container" role="status">
			<ResultContent state={state} isPending={isPending} />
		</div>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { render, screen } = await import('@testing-library/react');

	describe('ResultView', () => {
		const createState = (
			result: InitialState | OutcomeState,
			query: Partial<QueryState> = {},
		): ResultViewState => ({
			wikiUrl: new URL('https://en.wikipedia.org'),
			pageTitle: '',
			targetText: '',
			order: 'asc',
			...query,
			...result,
		});

		it('renders nothing before the first search', () => {
			render(<ResultView state={createState({ status: 'initial' })} />);

			expect(screen.queryByText(/an occurrence found/i)).toBeNull();
			expect(screen.getByRole('status').textContent).toBe('');
		});

		it('displays pending state when isPending is true', () => {
			render(
				<ResultView
					state={createState({ status: 'initial' })}
					isPending={true}
				/>,
			);

			expect(screen.getByText(/searching/i)).toBeTruthy();
		});

		it('prioritizes isPending over the result state', () => {
			const successState = createState(
				{ status: 'found', revisionId: 12345 },
				{ pageTitle: 'Test Article', targetText: 'Test Text' },
			);
			render(<ResultView state={successState} isPending={true} />);

			expect(screen.getByText(/searching/i)).toBeTruthy();
			expect(screen.queryByText(/an occurrence found/i)).toBeNull();
		});

		it('displays error state', () => {
			const errorState = createState({
				status: 'error',
				message: 'Test error message',
			});
			render(<ResultView state={errorState} />);

			expect(screen.getByText(/test error message/i)).toBeTruthy();
		});

		it('displays not found state', () => {
			const notFoundState = createState(
				{ status: 'not-found' },
				{ pageTitle: 'Test Page', targetText: 'Test Text' },
			);
			render(<ResultView state={notFoundState} />);

			expect(screen.getByText(/text not found/i)).toBeTruthy();
		});

		it('displays successful result with full details', () => {
			const successState = createState(
				{ status: 'found', revisionId: 12345 },
				{ pageTitle: 'Test Article', targetText: 'Test Text' },
			);
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
			const successState = createState(
				{ status: 'found', revisionId: 12345 },
				{ pageTitle: 'Test Article', targetText: 'Test Text' },
			);
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
			const successState = createState(
				{ status: 'found', revisionId: 12345 },
				{ pageTitle: 'Test Article', targetText: 'Test Text' },
			);
			render(<ResultView state={successState} />);

			const revisionLink = screen.getByText(/view revision/i);
			expect(revisionLink).toBeTruthy();
			expect(revisionLink.getAttribute('href')).toBe(
				'https://en.wikipedia.org/w/index.php?oldid=12345&diff=prev',
			);
		});

		it('exposes the card as a status region', () => {
			const successState = createState(
				{ status: 'found', revisionId: 12345 },
				{ pageTitle: 'Test Article', targetText: 'Test Text' },
			);
			render(<ResultView state={successState} />);

			const region = screen.getByRole('status');

			expect(region.querySelector('h2')?.textContent).toBe(
				'An Occurrence Found',
			);
			expect(region.textContent).toContain('Test Article');
		});
	});
}
