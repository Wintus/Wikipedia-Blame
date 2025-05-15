import { WIKI_SITES } from '../wiki';

type WikiSelectorProps = {
	selectedWiki: URL;
	onChange: (wiki: URL) => void;
};

export function WikiSelector({ selectedWiki, onChange }: WikiSelectorProps) {
	const handleChange = (wikiUrl: string) => {
		const wiki = WIKI_SITES.find((w) => w.url.href === wikiUrl);
		if (wiki == null) {
			return;
		}
		onChange(wiki.url);
	};

	return (
		<div className="form-group">
			<label htmlFor="wiki-url">Wiki Site:</label>
			<select
				id="wiki-url"
				name="wikiUrl"
				defaultValue={selectedWiki.href}
				onChange={(e) => handleChange(e.target.value)}
			>
				{WIKI_SITES.map((wiki) => (
					<option key={wiki.id} value={wiki.url.href}>
						{wiki.name} ({wiki.url.hostname})
					</option>
				))}
			</select>
		</div>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi } = await import('vitest');
	const { render, screen, fireEvent } = await import('@testing-library/react');

	const ENWP_URL = new URL('https://en.wikipedia.org');
	const JAWP_URL = new URL('https://ja.wikipedia.org');

	describe('WikiSelector', () => {
		const renderComponent = (selectedWiki = ENWP_URL, onChange = vi.fn()) =>
			render(<WikiSelector selectedWiki={selectedWiki} onChange={onChange} />);

		it('renders the component with correct label', () => {
			renderComponent();
			const label = screen.getByText('Wiki Site:');
			expect(label).toBeInTheDocument();
		});

		it('renders select element with correct id', () => {
			renderComponent();
			const selectElement = screen.getByLabelText('Wiki Site:');
			expect(selectElement).toHaveAttribute('id', 'wiki-url');
		});

		it('displays correct default wiki', () => {
			renderComponent(ENWP_URL);
			const selectElement =
				screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
			expect(selectElement.value).toBe(ENWP_URL.href);
		});

		it('displays correct alternative wiki when provided', () => {
			renderComponent(JAWP_URL);
			const selectElement =
				screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
			expect(selectElement.value).toBe(JAWP_URL.href);
		});

		it('calls onChange with correct wiki when changed', () => {
			const mockOnChange = vi.fn();
			renderComponent(ENWP_URL, mockOnChange);
			const selectElement =
				screen.getByLabelText<HTMLSelectElement>('Wiki Site:');
			fireEvent.change(selectElement, {
				target: { value: JAWP_URL.href },
			});
			expect(mockOnChange).toHaveBeenCalledWith(JAWP_URL);
		});

		it('renders options with correct text and values', () => {
			renderComponent();
			const options = screen.getAllByRole('option') as HTMLOptionElement[];
			expect(options.length).toBe(WIKI_SITES.length);
			for (const option of options) {
				const foundWiki = WIKI_SITES.find((w) => w.url.href === option.value);
				expect(foundWiki).toBeDefined();
				expect(option.textContent).toContain(foundWiki?.name);
				expect(option.textContent).toContain(foundWiki?.url.hostname);
			}
		});
	});
}
