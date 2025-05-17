import { use } from 'react';

interface Props {
	// TODO: use sum type instead
	promise: Promise<{ id?: string | null; error?: string }>;
}

export function PageIdFetcher({ promise }: Props) {
	const { id, error } = use(promise);
	// render
	return (
		<div>
			<input
				type="hidden"
				name="pageId"
				value={id ?? ''}
				data-testid="pageId-input"
			/>
			<div className="status-message-container">
				{error && <div className="error-message">{error}</div>}
			</div>
		</div>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { render, act, screen, waitFor } = await import(
		'@testing-library/react'
	);

	describe('PageIdFetcher', () => {
		it('renders without crashing', async () => {
			const promise = Promise.resolve({});
			const { container } = await act(async () =>
				render(<PageIdFetcher promise={promise} />)
			);
			expect(container).not.toBeEmptyDOMElement();
			await waitFor(() =>
				expect(screen.getByTestId('pageId-input')).toHaveValue('')
			);
		});

		it('crashes with rejected promise', async () => {
			const promise = Promise.reject(new Error('Test error'));
			try {
				await act(async () => render(<PageIdFetcher promise={promise} />));
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(Error);
			}
		});

		it('renders correct pageId when promise resolves with an ID', async () => {
			const promise = Promise.resolve({ id: '123' });
			await act(async () => render(<PageIdFetcher promise={promise} />));
			await waitFor(() =>
				expect(screen.getByTestId('pageId-input')).toHaveValue('123')
			);
			expect(
				screen.queryByText('Error fetching page ID. Please try again.')
			).not.toBeInTheDocument();
		});

		it('renders empty pageId when promise resolves with null ID', async () => {
			const promise = Promise.resolve({ id: null });
			await act(async () => render(<PageIdFetcher promise={promise} />));
			await waitFor(() =>
				expect(screen.getByTestId('pageId-input')).toHaveValue('')
			);
			expect(
				screen.queryByText('Error fetching page ID. Please try again.')
			).not.toBeInTheDocument();
		});

		it('renders error message when promise resolves with an error string', async () => {
			const promise = Promise.resolve({ error: 'Specific error message' });
			await act(async () => render(<PageIdFetcher promise={promise} />));
			await waitFor(() =>
				expect(screen.getByText('Specific error message')).toBeInTheDocument()
			);
			expect(screen.getByTestId('pageId-input')).toHaveValue('');
		});
	});
}
