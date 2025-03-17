import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchForm } from '../SearchForm';
import { getBaseUrl } from '../../services/WikipediaAPI';

// Mock the getBaseUrl function
vi.mock('../../services/WikipediaAPI', () => ({
	getBaseUrl: vi.fn(),
}));

describe('SearchForm', () => {
	const renderComponent = (onSearch = vi.fn(), isLoading = false) =>
		render(<SearchForm onSearch={onSearch} isLoading={isLoading} />);

	beforeEach(() => {
		(getBaseUrl as vi.Mock).mockReturnValue('https://en.wikipedia.org');
	});

	it('renders form inputs', () => {
		renderComponent();

		expect(screen.getByLabelText(/wikipedia article title/i)).toBeTruthy();
		expect(screen.getByLabelText(/text to find/i)).toBeTruthy();
		expect(
			screen.getByRole('button', { name: /find an occurrence/i })
		).toBeTruthy();
	});

	it('handles input changes', () => {
		renderComponent();

		const pageTitleInput = screen.getByLabelText(
			/wikipedia article title/i
		) as HTMLInputElement;
		const targetTextInput = screen.getByLabelText(
			/text to find/i
		) as HTMLTextAreaElement;

		fireEvent.change(pageTitleInput, { target: { value: 'Test Page' } });
		fireEvent.change(targetTextInput, { target: { value: 'Test Text' } });

		expect(pageTitleInput.value).toBe('Test Page');
		expect(targetTextInput.value).toBe('Test Text');
	});

	it('trims input values', () => {
		renderComponent();

		const pageTitleInput = screen.getByLabelText(
			/wikipedia article title/i
		) as HTMLInputElement;
		const targetTextInput = screen.getByLabelText(
			/text to find/i
		) as HTMLTextAreaElement;

		fireEvent.change(pageTitleInput, { target: { value: '  Test Page  ' } });
		fireEvent.change(targetTextInput, { target: { value: '  Test Text  ' } });

		expect(pageTitleInput.value).toBe('Test Page');
		expect(targetTextInput.value).toBe('Test Text');
	});

	it('disables submit button when loading', () => {
		renderComponent(vi.fn(), true);

		const submitButton = screen.getByRole('button', { name: /searching/i });
		expect(submitButton.hasAttribute('disabled')).toBe(true);
	});

	it('enables submit button when not loading', () => {
		renderComponent();

		const submitButton = screen.getByRole('button', {
			name: /find an occurrence/i,
		});
		expect(submitButton.hasAttribute('disabled')).toBe(false);
	});

	it('calls onSearch with correct parameters', () => {
		const mockOnSearch = vi.fn();
		renderComponent(mockOnSearch);

		const pageTitleInput = screen.getByLabelText(
			/wikipedia article title/i
		) as HTMLInputElement;
		const targetTextInput = screen.getByLabelText(
			/text to find/i
		) as HTMLTextAreaElement;
		const submitButton = screen.getByRole('button', {
			name: /find an occurrence/i,
		});

		fireEvent.change(pageTitleInput, { target: { value: 'Test Page' } });
		fireEvent.change(targetTextInput, { target: { value: 'Test Text' } });
		fireEvent.click(submitButton);

		expect(getBaseUrl).toHaveBeenCalledWith('en');
		expect(mockOnSearch).toHaveBeenCalledWith(
			'https://en.wikipedia.org',
			'Test Page',
			'Test Text'
		);
	});

	it('does not call onSearch when inputs are empty', () => {
		const mockOnSearch = vi.fn();
		renderComponent(mockOnSearch);

		const submitButton = screen.getByRole('button', {
			name: /find an occurrence/i,
		});
		fireEvent.click(submitButton);

		expect(mockOnSearch).not.toHaveBeenCalled();
	});

	it('includes language selector', () => {
		renderComponent();

		expect(screen.getByLabelText(/wikipedia language/i)).toBeTruthy();
	});
});
