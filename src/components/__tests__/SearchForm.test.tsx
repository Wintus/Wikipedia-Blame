import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchForm } from '../SearchForm';

describe('SearchForm', () => {
	const mockFormAction = vi.fn();
	const defaultProps = {
		formAction: mockFormAction,
		isPending: false,
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

		// Verify wiki is correctly serialized
		const wikiData = JSON.parse(formDataArg.get('wiki') as string);
		expect(wikiData).toEqual({
			id: 'enwp',
			name: 'English Wikipedia',
			url: 'https://en.wikipedia.org/',
		});
	});

	it('does not submit when inputs are empty', () => {
		render(<SearchForm {...defaultProps} />);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });
		fireEvent.click(button);
		expect(mockFormAction).not.toHaveBeenCalled();
	});

	it('disables the button when isPending is true', () => {
		render(
			<SearchForm formAction={defaultProps.formAction} isPending={true} />
		);
		const button = screen.getByRole('button');
		expect(button).toBeDisabled();
	});

	it('renders the WikiSelector component', () => {
		render(<SearchForm {...defaultProps} />);
		expect(screen.getByLabelText(/Wiki Site:/i)).toBeInTheDocument();
	});
});
