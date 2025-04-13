import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

	it('submits form with correct FormData', async () => {
		const user = userEvent.setup();
		render(<SearchForm {...defaultProps} />);
		const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
		const textArea = screen.getByLabelText(/Text to Find:/i);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });

		await user.type(titleInput, 'Albert Einstein');
		await user.type(textArea, 'relativity');
		await user.click(button);

		expect(mockFormAction).toHaveBeenCalledTimes(1);

		// Verify the FormData contains correct values
		const formDataArg = mockFormAction.mock.calls[0]?.[0];
		expect(formDataArg.get('pageTitle')).toBe('Albert Einstein');
		expect(formDataArg.get('targetText')).toBe('relativity');

		// Verify wiki is correctly selected
		const wikiId = formDataArg.get('wikiId') as string;
		expect(wikiId).toEqual('enwp');
	});

	it('submits form with empty inputs', async () => {
		const user = userEvent.setup();
		render(<SearchForm {...defaultProps} />);
		const button = screen.getByRole('button', { name: /Find An Occurrence/i });
		await user.click(button);
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

	it('the selected option remains selected after form submission', async () => {
		const user = userEvent.setup();
		render(<SearchForm {...defaultProps} />);
		const wikiSelector =
			screen.getByLabelText<HTMLSelectElement>(/Wiki Site:/i);

		await user.selectOptions(wikiSelector, 'jawp');
		expect(wikiSelector.value).toBe('jawp');

		await user.click(
			screen.getByRole('button', { name: /Find An Occurrence/i })
		);
		expect(wikiSelector.value).toBe('jawp');
	});
});
