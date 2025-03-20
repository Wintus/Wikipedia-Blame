import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from '../LanguageSelector';
import { WikiLanguage } from '../../types';
import '@testing-library/jest-dom';

describe('LanguageSelector', () => {
	const renderComponent = (language: WikiLanguage = 'en', onChange = vi.fn()) =>
		render(<LanguageSelector language={language} onChange={onChange} />);

	it('renders the component with correct label', () => {
		renderComponent();
		const label = screen.getByText('Wikipedia Language:');
		expect(label).toBeInTheDocument();
	});

	it('renders select element with correct id', () => {
		renderComponent();
		const selectElement = screen.getByLabelText('Wikipedia Language:');
		expect(selectElement).toHaveAttribute('id', 'language-select');
	});

	it('displays correct default language', () => {
		renderComponent('en');
		const selectElement = screen.getByLabelText(
			'Wikipedia Language:'
		) as HTMLSelectElement;
		expect(selectElement.value).toBe('en');
	});

	it('displays correct alternative language', () => {
		renderComponent('ja');
		const selectElement = screen.getByLabelText(
			'Wikipedia Language:'
		) as HTMLSelectElement;
		expect(selectElement.value).toBe('ja');
	});

	it('calls onChange with correct language when changed', () => {
		const mockOnChange = vi.fn();
		renderComponent('en', mockOnChange);

		const selectElement = screen.getByLabelText('Wikipedia Language:');
		fireEvent.change(selectElement, { target: { value: 'ja' } });

		expect(mockOnChange).toHaveBeenCalledWith('ja');
	});

	it('renders both language options with correct text', () => {
		renderComponent();
		const options = screen.getAllByRole('option');

		expect(options).toHaveLength(2);
		expect(options[0]).toHaveTextContent('English (en.wikipedia.org)');
		expect(options[1]).toHaveTextContent('Japanese (ja.wikipedia.org)');
	});

	it('renders options with correct values', () => {
		renderComponent();
		const options = screen.getAllByRole('option') as HTMLOptionElement[];

		expect(options[0].value).toBe('en');
		expect(options[1].value).toBe('ja');
	});
});
