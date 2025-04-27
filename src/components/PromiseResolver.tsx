import { use } from 'react';

interface props {
	promise: Promise<void>;
}

export function PromiseResolver({ promise }: props) {
	use(promise);
	// render nothing
	return null;
}

if (import.meta.vitest) {
	const { describe, it, expect } = await import('vitest');
	const { render, act } = await import('@testing-library/react');

	describe('PromiseResolver', () => {
		it('renders without crashing', async () => {
			const promise = Promise.resolve();
			const { container } = await act(async () =>
				render(<PromiseResolver promise={promise} />)
			);
			expect(container).toBeEmptyDOMElement();
		});

		it('crashes with rejected promise', async () => {
			const promise = Promise.reject(new Error('Test error'));
			try {
				await act(async () => render(<PromiseResolver promise={promise} />));
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(Error);
			}
		});
	});
}
