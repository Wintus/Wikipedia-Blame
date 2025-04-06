import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WikiSelector } from '../WikiSelector';
import { WIKI_SITES, type WikiSite } from '../../wiki';

describe('WikiSelector', () => {
	const renderComponent = (
		selectedWiki: WikiSite = WIKI_SITES.ENWP,
		onChange = vi.fn()
	) => render(<WikiSelector selectedWiki={selectedWiki} onChange={onChange} />);

	it('renders the component with correct label', () => {
		renderComponent();
		const label = screen.getByText('Wiki Site:');
		expect(label).toBeInTheDocument();
	});

	it('renders select element with correct id', () => {
		renderComponent();
		const selectElement = screen.getByLabelText('Wiki Site:');
		expect(selectElement).toHaveAttribute('id', 'wiki-select');
	});

	it('displays correct default wiki', () => {
		renderComponent(WIKI_SITES.ENWP);
		const selectElement =
			screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
		expect(selectElement.value).toBe(WIKI_SITES.ENWP.id);
	});

	it('displays correct alternative wiki when provided', () => {
		renderComponent(WIKI_SITES.JAWP);
		const selectElement =
			screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
		expect(selectElement.value).toBe(WIKI_SITES.JAWP.id);
	});

	it('calls onChange with correct wiki when changed', () => {
		const mockOnChange = vi.fn();
		renderComponent(WIKI_SITES.ENWP, mockOnChange);
		const selectElement =
			screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
		fireEvent.change(selectElement, {
			target: { value: WIKI_SITES.JAWP.id },
		});
		expect(mockOnChange).toHaveBeenCalledWith(WIKI_SITES.JAWP);
	});

	it('renders options with correct text and values', () => {
		renderComponent();
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
