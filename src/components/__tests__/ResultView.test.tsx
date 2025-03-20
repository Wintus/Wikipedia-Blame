import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultView } from '../ResultView';
import { SearchResult } from '../../types';

describe('ResultView', () => {
	const createResult = (
		overrides: Partial<SearchResult> = {}
	): SearchResult => ({
		pageTitle: '',
		targetText: '',
		revisionId: null,
		loading: false,
		error: null,
		language: 'en',
		...overrides,
	});

	it('displays loading state', () => {
		const loadingResult = createResult({ loading: true });
		render(<ResultView result={loadingResult} />);

		expect(screen.getByText(/searching/i)).toBeTruthy();
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
});
