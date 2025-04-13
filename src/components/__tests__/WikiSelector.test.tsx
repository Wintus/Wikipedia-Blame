import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WikiSelector } from '../WikiSelector';
import { WIKI_SITES } from '../../wiki';

describe('WikiSelector', () => {
	it('renders the component with correct label', () => {
		render(<WikiSelector />);
		const label = screen.getByText('Wiki Site:');
		expect(label).toBeInTheDocument();
	});

	it('renders select element with correct id', () => {
		render(<WikiSelector />);
		const selectElement = screen.getByLabelText('Wiki Site:');
		expect(selectElement).toHaveAttribute('id', 'wiki-select');
	});

	it('displays correct default wiki', () => {
		render(<WikiSelector />);
		const selectElement =
			screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
		expect(selectElement.value).toBe('enwp');
	});

	it('displays correct alternative wiki when provided', () => {
		render(<WikiSelector selectedWiki="jawp" />);
		const selectElement =
			screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
		expect(selectElement.value).toBe('jawp');
	});

	it('renders options with correct text and values', () => {
		render(<WikiSelector />);
		const options = screen.getAllByRole('option') as HTMLOptionElement[];
		expect(options.length).toBe(Object.keys(WIKI_SITES).length);
		for (const option of options) {
			const foundWiki = Object.values(WIKI_SITES).find(
				(w) => w.id === option.value
			);
			expect(foundWiki).toBeDefined();
			expect(option.textContent).toContain(foundWiki?.name);
			expect(option.textContent).toContain(foundWiki?.url.hostname);
		}
	});
});
