import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchForm } from '../SearchForm';

describe('SearchForm', () => {
	const mockOnSearch = vi.fn();
	const defaultProps = { onSearch: mockOnSearch, isLoading: false };

	beforeEach(() => {
		mockOnSearch.mockClear();
	});

	it('renders form inputs and button', () => {
		render(<SearchForm {...defaultProps} />);
		expect(screen.getByLabelText(/Wiki Article Title:/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Text to Find:/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /Find An Occurrence/i })
		).toBeInTheDocument();
	});

	it('calls onSearch with correct parameters when form is submitted', () => {
		render(<SearchForm {...defaultProps} />);
		const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
		const textArea = screen.getByLabelText(/Text to Find:/i);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });

		fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
		fireEvent.change(textArea, { target: { value: 'relativity' } });
		fireEvent.click(button);

		expect(mockOnSearch).toHaveBeenCalledTimes(1);
		expect(mockOnSearch).toHaveBeenCalledWith(
			{
				id: 'enwp',
				name: 'English Wikipedia',
				url: new URL('https://en.wikipedia.org/'),
			},
			'Albert Einstein',
			'relativity'
		);
	});

	it('does not call onSearch when inputs are empty', () => {
		render(<SearchForm {...defaultProps} />);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });
		fireEvent.click(button);
		expect(mockOnSearch).not.toHaveBeenCalled();
	});

	it('disables the button when isLoading is true', () => {
		render(<SearchForm onSearch={defaultProps.onSearch} isLoading={true} />);
		const button = screen.getByRole('button');
		expect(button).toBeDisabled();
	});

	it('renders the WikiSelector component', () => {
		render(<SearchForm {...defaultProps} />);
		expect(screen.getByLabelText(/Wiki Site:/i)).toBeInTheDocument();
	});

	it('updates the selected wiki when WikiSelector changes', () => {
		render(<SearchForm {...defaultProps} />);
		const wikiSelector = screen.getByLabelText(/Wiki Site:/i);
		fireEvent.change(wikiSelector, { target: { value: 'jawp' } });

		const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
		const textArea = screen.getByLabelText(/Text to Find:/i);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });

		fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
		fireEvent.change(textArea, { target: { value: 'relativity' } });
		fireEvent.click(button);

		expect(mockOnSearch).toHaveBeenCalledWith(
			{
				id: 'jawp',
				name: 'Japanese Wikipedia',
				url: new URL('https://ja.wikipedia.org/'),
			},
			'Albert Einstein',
			'relativity'
		);
	});
});
