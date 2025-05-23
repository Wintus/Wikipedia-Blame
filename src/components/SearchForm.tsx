import { useState } from 'react';
import { type SearchState } from '../state';
import { WikiSelector } from './WikiSelector';
import { PageTitleInput } from './PageTitleInput';

interface SearchFormProps {
	formAction: (formData: FormData) => void;
	isPending: boolean;
	searchState: SearchState;
}

export function SearchForm({
	formAction,
	isPending,
	searchState,
}: SearchFormProps) {
	const [wikiUrl, setWikiUrl] = useState(searchState.wikiUrl);

	return (
		<form action={formAction} className="search-form" name="searchForm">
			<WikiSelector selectedWiki={wikiUrl} onChange={setWikiUrl} />

			<PageTitleInput
				initialPageTitle={searchState.pageTitle}
				wikiUrl={wikiUrl}
			/>

			<div className="form-group">
				<label htmlFor="target-text">Text to Find:</label>
				<textarea
					id="target-text"
					name="targetText"
					defaultValue={searchState.targetText}
					placeholder="Enter text to search for in the article's history"
					required
				/>
			</div>

			<div className="form-group">
				<label htmlFor="start-rev-id">Search from Rev ID (optional):</label>
				<input
					type="text"
					pattern="\d*"
					id="start-rev-id"
					name="startRevId"
					placeholder="Enter a revision ID to start searching from"
				/>
			</div>

			<div className="form-group">
				<label htmlFor="end-rev-id">End Rev ID (optional):</label>
				<input
					type="text"
					pattern="\d*"
					id="end-rev-id"
					name="endRevId"
					placeholder="Enter a revision ID to search up to"
				/>
			</div>

			<fieldset className="form-group" key={searchState.order}>
				<legend>Search Order:</legend>
				<label>
					<input
						type="radio"
						name="order"
						value="asc"
						defaultChecked={searchState.order === 'asc'}
					/>
					Ascending (Older First)
				</label>
				<label>
					<input
						type="radio"
						name="order"
						value="desc"
						defaultChecked={searchState.order === 'desc'}
					/>
					Descending (Newer First)
				</label>
			</fieldset>

			<button type="submit" disabled={isPending}>
				{isPending ? 'Searching...' : 'Find An Occurrence'}
			</button>
		</form>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach, afterAll } = import.meta.vitest;
	const { render, screen, act } = await import('@testing-library/react');
	const { userEvent } = await import('@testing-library/user-event');
	const MediaWikiAPIs = await import('../services/MediaWikiAPIs');

	describe('SearchForm', () => {
		const mockFormAction = vi.fn();
		const defaultSearchState = {
			wikiUrl: new URL('https://en.wikipedia.org'),
			pageId: null,
			pageTitle: 'Initial Title',
			targetText: 'Initial Text',
			revisionId: null,
			order: 'asc',
			error: null,
			searchCount: 0,
		} as const satisfies SearchState;

		const emptySearchState = {
			wikiUrl: new URL('https://en.wikipedia.org'),
			pageId: null,
			pageTitle: '',
			targetText: 'Initial Text',
			revisionId: null,
			order: 'asc',
			error: null,
			searchCount: 0,
		} as const satisfies SearchState;

		const emptySearchProps = {
			formAction: mockFormAction,
			isPending: false,
			searchState: emptySearchState,
		};

		const defaultProps = {
			formAction: mockFormAction,
			isPending: false,
			searchState: defaultSearchState,
		};

		const mockFetchPageId = vi.fn().mockResolvedValue(123);

		beforeEach(() => {
			mockFormAction.mockClear();
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId
			);
		});

		afterAll(() => {
			vi.restoreAllMocks();
		});

		it('renders form inputs and button', async () => {
			await act(async () => render(<SearchForm {...defaultProps} />));
			expect(screen.getByLabelText(/Wiki Article Title:/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Text to Find:/i)).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /Find An Occurrence/i })
			).toBeInTheDocument();
		});

		it('submits form with correct FormData', async () => {
			const user = userEvent.setup();
			await act(async () => render(<SearchForm {...defaultProps} />));
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const textArea = screen.getByLabelText(/Text to Find:/i);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});

			await user.clear(titleInput);
			await user.type(titleInput, 'Albert Einstein');
			await user.clear(textArea);
			await user.type(textArea, 'relativity');
			await user.click(button);

			expect(mockFormAction).toHaveBeenCalledTimes(1);

			// Verify the FormData contains correct values
			const formDataArg = mockFormAction.mock.calls[0]?.[0];
			expect(formDataArg.get('pageTitle')).toBe('Albert Einstein');
			expect(formDataArg.get('targetText')).toBe('relativity');

			// Verify wiki is correctly selected
			const wikiUrl = formDataArg.get('wikiUrl') as string;
			expect(wikiUrl).toEqual('https://en.wikipedia.org/');
		});

		it('renders the startRevId input field', async () => {
			await act(async () => render(<SearchForm {...defaultProps} />));
			expect(
				screen.getByLabelText(/Search from Rev ID \(optional\):/i)
			).toBeInTheDocument();
		});

		it('renders the endRevId input field', async () => {
			await act(async () => render(<SearchForm {...defaultProps} />));
			expect(
				screen.getByLabelText(/End Rev ID \(optional\):/i)
			).toBeInTheDocument();
		});

		it('does not populate the endRevId input with the revisionId from searchState', async () => {
			await act(async () =>
				render(
					<SearchForm
						formAction={mockFormAction}
						isPending={false}
						searchState={{
							...defaultSearchState,
							revisionId: 12345,
						}}
					/>
				)
			);
			const endRevIdInput = screen.getByLabelText(
				/End Rev ID \(optional\):/i
			) as HTMLInputElement;
			expect(endRevIdInput.value).not.toBe('12345');
			expect(endRevIdInput.value).toBe('');
		});

		it('submits form with correct FormData including endRevId', async () => {
			const user = userEvent.setup();
			await act(async () => render(<SearchForm {...defaultProps} />));
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const textArea = screen.getByLabelText(/Text to Find:/i);
			const endRevIdInput = screen.getByLabelText(/End Rev ID \(optional\):/i);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});

			await user.clear(titleInput);
			await user.type(titleInput, 'Albert Einstein');
			await user.clear(textArea);
			await user.type(textArea, 'relativity');
			await user.clear(endRevIdInput);
			await user.type(endRevIdInput, '67890');
			await user.click(button);

			expect(mockFormAction).toHaveBeenCalledTimes(1);

			// Verify the FormData contains correct values
			const formDataArg = mockFormAction.mock.calls[0]?.[0];
			expect(formDataArg.get('pageTitle')).toBe('Albert Einstein');
			expect(formDataArg.get('targetText')).toBe('relativity');
			expect(formDataArg.get('endRevId')).toBe('67890');

			// Verify wiki is correctly selected
			const wikiUrl = formDataArg.get('wikiUrl') as string;
			expect(wikiUrl).toEqual('https://en.wikipedia.org/');
		});

		it('does not submit when inputs are empty', async () => {
			const user = userEvent.setup();
			await act(async () =>
				render(
					<SearchForm
						{...defaultProps}
						searchState={{
							...defaultSearchState,
							pageTitle: '',
							targetText: '',
						}}
					/>
				)
			);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});
			await user.click(button);
			expect(mockFormAction).not.toHaveBeenCalled();
		});

		it('disables the button when isPending is true', async () => {
			await act(async () =>
				render(
					<SearchForm
						formAction={mockFormAction}
						isPending={true}
						searchState={defaultSearchState}
					/>
				)
			);
			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
		});

		it('renders the WikiSelector component', async () => {
			await act(async () => render(<SearchForm {...defaultProps} />));
			expect(screen.getByLabelText(/Wiki Site:/i)).toBeInTheDocument();
		});

		it('the selected option remains selected after form submission', async () => {
			const { fireEvent } = await import('@testing-library/react');
			const user = userEvent.setup();
			await act(async () => render(<SearchForm {...defaultProps} />));
			const wikiSelector =
				await screen.findByLabelText<HTMLSelectElement>(/Wiki Site:/i);

			await act(async () => {
				// use fireEvent due to waring of act unsupported
				fireEvent.change(wikiSelector, {
					target: { value: 'https://ja.wikipedia.org/' },
				});
			});

			expect(wikiSelector.value).toBe('https://ja.wikipedia.org/');

			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});
			user.click(button);

			expect(wikiSelector.value).toBe('https://ja.wikipedia.org/');
		});

		it('renders initial values from searchState', async () => {
			await act(async () =>
				render(
					<SearchForm
						formAction={mockFormAction}
						isPending={false}
						searchState={{
							wikiUrl: new URL('https://ja.wikipedia.org'),
							pageId: null,
							pageTitle: 'Initial Page Title',
							targetText: 'Initial Target Text',
							revisionId: null,
							order: 'asc',
							error: null,
							searchCount: 0,
						}}
					/>
				)
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
			expect(wikiSelector.value).toBe('https://ja.wikipedia.org/');
		});

		it('renders the order radio buttons', async () => {
			await act(async () => render(<SearchForm {...defaultProps} />));
			expect(
				screen.getByLabelText(/Ascending \(Older First\)/i)
			).toBeInTheDocument();
			expect(
				screen.getByLabelText(/Descending \(Newer First\)/i)
			).toBeInTheDocument();
		});

		it('renders with correct defaultChecked based on searchState', async () => {
			const searchStateAsc = {
				...defaultProps.searchState,
				order: 'asc' as const,
			};
			await act(async () =>
				render(<SearchForm {...defaultProps} searchState={searchStateAsc} />)
			);
			expect(
				screen.getByLabelText(/Descending \(Newer First\)/i)
			).toBeInTheDocument();
		});

		it('renders with correct defaultChecked based on searchState', async () => {
			const searchStateAsc = {
				...defaultProps.searchState,
				order: 'asc' as const,
			};
			const { rerender } = await act(async () =>
				render(
					<SearchForm {...emptySearchProps} searchState={searchStateAsc} />
				)
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
			await act(async () =>
				rerender(<SearchForm {...defaultProps} searchState={searchStateDesc} />)
			);
			const radioAsc2 = screen.getByLabelText(
				/Ascending \(Older First\)/i
			) as HTMLInputElement;
			expect(radioAsc2.defaultChecked).toBe(false);
			const radioDesc2 = screen.getByLabelText(
				/Descending \(Newer First\)/i
			) as HTMLInputElement;
			expect(radioDesc2.defaultChecked).toBe(true);
		});

		it('submits form with correct FormData including order', async () => {
			const user = userEvent.setup();
			await act(async () => render(<SearchForm {...defaultProps} />));
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const textArea = screen.getByLabelText(/Text to Find:/i);
			const descendingRadio = screen.getByLabelText(
				/Descending \(Newer First\)/i
			);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});

			await user.clear(titleInput);
			await user.type(titleInput, 'Albert Einstein');
			await user.clear(textArea);
			await user.type(textArea, 'relativity');
			await user.click(descendingRadio);
			await user.click(button);

			expect(mockFormAction).toHaveBeenCalledTimes(1);

			// Verify the FormData contains correct values
			const formDataArg = mockFormAction.mock.calls[0]?.[0];
			expect(formDataArg.get('pageTitle')).toBe('Albert Einstein');
			expect(formDataArg.get('targetText')).toBe('relativity');
			expect(formDataArg.get('order')).toBe('desc');

			// Verify wiki is correctly selected
			const wikiUrl = formDataArg.get('wikiUrl') as string;
			expect(wikiUrl).toEqual('https://en.wikipedia.org/');
		});
	});
}
