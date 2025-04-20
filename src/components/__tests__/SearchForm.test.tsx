import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from '../SearchForm';

describe('SearchForm', () => {
	const mockFormAction = vi.fn();
	const defaultSearchState = {
		wiki: {
			id: 'enwp',
			name: 'English Wikipedia',
			url: new URL('https://en.wikipedia.org'),
		},
		pageTitle: 'Initial Title',
		targetText: 'Initial Text',
		revisionId: null,
		error: null,
		searchCount: 0,
		order: 'asc',
	} as const;
	const defaultProps = {
		formAction: mockFormAction,
		isPending: false,
		searchState: defaultSearchState,
	};

	beforeEach(() => {
		mockFormAction.mockClear();
	});

	it('renders form inputs and button', () => {
		render(<SearchForm {...defaultProps} />);
		expect(screen.getByLabelText(/Wiki Article Title:/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Text to Find:/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /Find An Occurrence/i })
		).toBeInTheDocument();
	});

	it('submits form with correct FormData', () => {
		render(<SearchForm {...defaultProps} />);
		const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
		const textArea = screen.getByLabelText(/Text to Find:/i);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });

		fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
		fireEvent.change(textArea, { target: { value: 'relativity' } });
		fireEvent.click(button);

		expect(mockFormAction).toHaveBeenCalledTimes(1);

		// Verify the FormData contains correct values
		const formDataArg = mockFormAction.mock.calls[0]?.[0];
		expect(formDataArg.get('pageTitle')).toBe('Albert Einstein');
		expect(formDataArg.get('targetText')).toBe('relativity');

		// Verify wiki is correctly selected
		const wikiId = formDataArg.get('wikiId') as string;
		expect(wikiId).toEqual('enwp');
	});

	it('renders the uptoRevId input field', () => {
		render(<SearchForm {...defaultProps} />);
		expect(
			screen.getByLabelText(/Search up to Rev ID \(optional\):/i)
		).toBeInTheDocument();
	});

	it('populates the uptoRevId input with the revisionId from searchState', () => {
		render(
			<SearchForm
				formAction={mockFormAction}
				isPending={false}
				searchState={{
					...defaultSearchState,
					revisionId: 12345,
				}}
			/>
		);
		const uptoRevIdInput = screen.getByLabelText(
			/Search up to Rev ID \(optional\):/i
		) as HTMLInputElement;
		expect(uptoRevIdInput.value).toBe('12345');
	});

	it('submits form with correct FormData including uptoRevId', () => {
		render(<SearchForm {...defaultProps} />);
		const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
		const textArea = screen.getByLabelText(/Text to Find:/i);
		const uptoRevIdInput = screen.getByLabelText(
			/Search up to Rev ID \(optional\):/i
		);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });

		fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
		fireEvent.change(textArea, { target: { value: 'relativity' } });
		fireEvent.change(uptoRevIdInput, { target: { value: '67890' } });
		fireEvent.click(button);

		expect(mockFormAction).toHaveBeenCalledTimes(1);

		// Verify the FormData contains correct values
		const formDataArg = mockFormAction.mock.calls[0]?.[0];
		expect(formDataArg.get('pageTitle')).toBe('Albert Einstein');
		expect(formDataArg.get('targetText')).toBe('relativity');
		expect(formDataArg.get('uptoRevId')).toBe('67890');

		// Verify wiki is correctly selected
		const wikiId = formDataArg.get('wikiId') as string;
		expect(wikiId).toEqual('enwp');
	});

	it('does not submit when inputs are empty', async () => {
		render(
			<SearchForm
				{...defaultProps}
				searchState={{
					...defaultSearchState,
					pageTitle: '',
					targetText: '',
				}}
			/>
		);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });
		await userEvent.click(button);
		expect(mockFormAction).not.toHaveBeenCalled();
	});

	it('disables the button when isPending is true', () => {
		render(
			<SearchForm
				formAction={mockFormAction}
				isPending={true}
				searchState={defaultSearchState}
			/>
		);
		const button = screen.getByRole('button');
		expect(button).toBeDisabled();
	});

	it('renders the WikiSelector component', () => {
		render(<SearchForm {...defaultProps} />);
		expect(screen.getByLabelText(/Wiki Site:/i)).toBeInTheDocument();
	});

	it('the selected option remains selected after form submission', () => {
		render(<SearchForm {...defaultProps} />);
		const wikiSelector =
			screen.getByLabelText<HTMLSelectElement>(/Wiki Site:/i);

		fireEvent.change(wikiSelector, { target: { value: 'jawp' } });
		expect(wikiSelector.value).toBe('jawp');

		fireEvent.submit(screen.getByRole('form'));
		expect(wikiSelector.value).toBe('jawp');
	});

	it('renders initial values from searchState', () => {
		render(
			<SearchForm
				formAction={mockFormAction}
				isPending={false}
				searchState={{
					wiki: {
						id: 'jawp',
						name: 'Japanese Wikipedia',
						url: new URL('https://ja.wikipedia.org'),
					},
					pageTitle: 'Initial Page Title',
					targetText: 'Initial Target Text',
					revisionId: null,
					error: null,
					searchCount: 0,
					order: 'asc',
				}}
			/>
		);

		const titleInput = screen.getByLabelText(
			/Wiki Article Title:/i
		) as HTMLInputElement;
		const textArea = screen.getByLabelText(
			/Text to Find:/i
		) as HTMLTextAreaElement;
		const wikiSelector = screen.getByLabelText(
			/Wiki Site:/i
		) as HTMLSelectElement;

		expect(titleInput.value).toBe('Initial Page Title');
		expect(textArea.value).toBe('Initial Target Text');
		expect(wikiSelector.value).toBe('jawp');
	});

	it('renders the order radio buttons', () => {
		render(<SearchForm {...defaultProps} />);
		expect(
			screen.getByLabelText(/Ascending \(Older First\)/i)
		).toBeInTheDocument();
		expect(
			screen.getByLabelText(/Descending \(Newer First\)/i)
		).toBeInTheDocument();
	});

	it('renders with correct defaultChecked based on searchState', () => {
		const searchStateAsc = {
			...defaultProps.searchState,
			order: 'asc' as const,
		};
		render(<SearchForm {...defaultProps} searchState={searchStateAsc} />);
		expect(
			screen.getByLabelText(/Descending \(Newer First\)/i)
		).toBeInTheDocument();
	});

	it('renders with correct defaultChecked based on searchState', () => {
		const searchStateAsc = {
			...defaultProps.searchState,
			order: 'asc' as const,
		};
		const { rerender } = render(
			<SearchForm {...defaultProps} searchState={searchStateAsc} />
		);

		const radioAsc = screen.getByLabelText(
			/Ascending \(Older First\)/i
		) as HTMLInputElement;
		expect(radioAsc.defaultChecked).toBe(true);
		const radioDesc = screen.getByLabelText(
			/Descending \(Newer First\)/i
		) as HTMLInputElement;
		expect(radioDesc.defaultChecked).toBe(false);

		const searchStateDesc = {
			...defaultProps.searchState,
			order: 'desc' as const,
		};
		rerender(<SearchForm {...defaultProps} searchState={searchStateDesc} />);
		const radioAsc2 = screen.getByLabelText(
			/Ascending \(Older First\)/i
		) as HTMLInputElement;
		expect(radioAsc2.defaultChecked).toBe(false);
		const radioDesc2 = screen.getByLabelText(
			/Descending \(Newer First\)/i
		) as HTMLInputElement;
		expect(radioDesc2.defaultChecked).toBe(true);
	});

	it('submits form with correct FormData including order', () => {
		render(<SearchForm {...defaultProps} />);
		const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
		const textArea = screen.getByLabelText(/Text to Find:/i);
		const descendingRadio = screen.getByLabelText(
			/Descending \(Newer First\)/i
		);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });

		fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
		fireEvent.change(textArea, { target: { value: 'relativity' } });
		fireEvent.click(descendingRadio); // Select descending order
		fireEvent.click(button);

		expect(mockFormAction).toHaveBeenCalledTimes(1);

		// Verify the FormData contains correct values
		const formDataArg = mockFormAction.mock.calls[0]?.[0];
		expect(formDataArg.get('pageTitle')).toBe('Albert Einstein');
		expect(formDataArg.get('targetText')).toBe('relativity');
		expect(formDataArg.get('order')).toBe('desc');

		// Verify wiki is correctly selected
		const wikiId = formDataArg.get('wikiId') as string;
		expect(wikiId).toEqual('enwp');
	});
});
