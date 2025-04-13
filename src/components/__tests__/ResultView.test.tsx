import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultView } from '../ResultView';
import { type SearchState, WIKI_SITES } from '../../wiki';

describe('ResultView', () => {
	const createResult = (overrides: Partial<SearchState> = {}): SearchState => ({
		wiki: WIKI_SITES.ENWP,
		pageTitle: '',
		targetText: '',
		revisionId: null,
		error: null,
		searchCount: 0,
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
