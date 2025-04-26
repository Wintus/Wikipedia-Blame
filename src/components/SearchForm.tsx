import { useState, useEffect } from 'react';
import { type SearchState, type WikiSite } from '../wiki';
import { WikiSelector } from './WikiSelector';
import useDebounce from '../hooks/useDebounce';
import { fetchPageId } from '../services/MediaWikiAPIs';

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
	const [pageTitle, setPageTitle] = useState(searchState.pageTitle);
	const [targetText, setTargetText] = useState(searchState.targetText);
	const [selectedWiki, setSelectedWiki] = useState<WikiSite>(searchState.wiki);
	const [pageId, setPageId] = useState<number | null>(null);
	const [pageIdError, setPageIdError] = useState<string | null>(null);
	const debouncedPageTitle = useDebounce(pageTitle, 300);

	useEffect(() => {
		setPageId(null);
		setPageIdError(null);

		if (!debouncedPageTitle) {
			return;
		}

		fetchPageId(selectedWiki.url, debouncedPageTitle)
			.then((id) => {
				setPageId(id);
			})
			.catch((error) => {
				console.error('Error fetching page ID:', error);
				setPageIdError('Error fetching page ID. Please try again.');
				setPageId(null);
			});
	}, [debouncedPageTitle, selectedWiki]);

	return (
		<form action={formAction} className="search-form" name="searchForm">
			<WikiSelector selectedWiki={selectedWiki} onChange={setSelectedWiki} />

			<input
				type="hidden"
				name="pageId"
				value={pageId ?? ''}
				data-testid="pageId-input"
			/>
			<div className="form-group">
				<label htmlFor="page-title">Wiki Article Title:</label>
				<input
					type="text"
					id="page-title"
					name="pageTitle"
					value={pageTitle}
					onChange={(e) => setPageTitle(e.target.value)}
					placeholder="e.g. Albert Einstein"
					required
				/>
				{pageIdError && <div className="error-message">{pageIdError}</div>}
			</div>

			<div className="form-group">
				<label htmlFor="target-text">Text to Find:</label>
				<textarea
					id="target-text"
					name="targetText"
					value={targetText}
					onChange={(e) => setTargetText(e.target.value)}
					placeholder="Enter text to search for in the article's history"
					required
				/>
			</div>

			<div className="form-group">
				<label htmlFor="upto-rev-id">Search up to Rev ID (optional):</label>
				<input
					type="text"
					pattern="\d*"
					id="upto-rev-id"
					name="uptoRevId"
					defaultValue={searchState.revisionId?.toString() ?? ''}
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

if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach } = await import('vitest');
	const { render, screen, fireEvent, waitFor, act } = await import('@testing-library/react');
	const userEvent = (await import('@testing-library/user-event')).default;
	const MediaWikiAPIs = await import('../services/MediaWikiAPIs');

	describe('SearchForm', () => {
		const mockFormAction = vi.fn();
		const defaultSearchState = {
			wiki: {
				id: 'enwp',
				name: 'English Wikipedia',
				url: new URL('https://en.wikipedia.org'),
			},
			pageId: null,
			pageTitle: 'Initial Title',
			targetText: 'Initial Text',
			revisionId: null,
			order: 'asc',
			error: null,
			searchCount: 0,
		} as const;

		const emptySearchState = {
			wiki: {
				id: 'enwp',
				name: 'English Wikipedia',
				url: new URL('https://en.wikipedia.org'),
			},
			pageId: null,
			pageTitle: '',
			targetText: 'Initial Text',
			revisionId: null,
			order: 'asc',
			error: null,
			searchCount: 0,
		} as const;

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

		beforeEach(() => {
			mockFormAction.mockClear();
			const mockFetchPageId = vi.fn().mockResolvedValue(123);
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId
			);
		});

		it('renders form inputs and button', async () => {
			render(<SearchForm {...defaultProps} />);
			expect(screen.getByLabelText(/Wiki Article Title:/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Text to Find:/i)).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /Find An Occurrence/i })
			).toBeInTheDocument();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('submits form with correct FormData', async () => {
			render(<SearchForm {...defaultProps} />);
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const textArea = screen.getByLabelText(/Text to Find:/i);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});

			await act(async () => {
				fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
			});
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

		it('renders the uptoRevId input field', async () => {
			render(<SearchForm {...defaultProps} />);
			expect(
				screen.getByLabelText(/Search up to Rev ID \(optional\):/i)
			).toBeInTheDocument();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('populates the uptoRevId input with the revisionId from searchState', async () => {
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
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('submits form with correct FormData including uptoRevId', async () => {
			render(<SearchForm {...defaultProps} />);
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const textArea = screen.getByLabelText(/Text to Find:/i);
			const uptoRevIdInput = screen.getByLabelText(
				/Search up to Rev ID \(optional\):/i
			);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});

			await act(async () => {
				fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
			});
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
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});
			await userEvent.click(button);
			expect(mockFormAction).not.toHaveBeenCalled();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('disables the button when isPending is true', async () => {
			render(
				<SearchForm
					formAction={mockFormAction}
					isPending={true}
					searchState={defaultSearchState}
				/>
			);
			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('renders the WikiSelector component', async () => {
			render(<SearchForm {...defaultProps} />);
			expect(screen.getByLabelText(/Wiki Site:/i)).toBeInTheDocument();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('the selected option remains selected after form submission', async () => {
			render(<SearchForm {...defaultProps} />);
			const wikiSelector =
				screen.getByLabelText<HTMLSelectElement>(/Wiki Site:/i);

			fireEvent.change(wikiSelector, { target: { value: 'jawp' } });
			expect(wikiSelector.value).toBe('jawp');

			fireEvent.submit(screen.getByRole('form'));
			expect(wikiSelector.value).toBe('jawp');

			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('renders initial values from searchState', async () => {
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
						pageId: null,
						pageTitle: 'Initial Page Title',
						targetText: 'Initial Target Text',
						revisionId: null,
						order: 'asc',
						error: null,
						searchCount: 0,
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

			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('renders the order radio buttons', async () => {
			render(<SearchForm {...defaultProps} />);
			expect(
				screen.getByLabelText(/Ascending \(Older First\)/i)
			).toBeInTheDocument();
			expect(
				screen.getByLabelText(/Descending \(Newer First\)/i)
			).toBeInTheDocument();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('renders with correct defaultChecked based on searchState', async () => {
			const searchStateAsc = {
				...defaultProps.searchState,
				order: 'asc' as const,
			};
			render(<SearchForm {...defaultProps} searchState={searchStateAsc} />);
			expect(
				screen.getByLabelText(/Descending \(Newer First\)/i)
			).toBeInTheDocument();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('renders with correct defaultChecked based on searchState', async () => {
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

			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('submits form with correct FormData including order', async () => {
			render(<SearchForm {...defaultProps} />);
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const textArea = screen.getByLabelText(/Text to Find:/i);
			const descendingRadio = screen.getByLabelText(
				/Descending \(Newer First\)/i
			);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});

			await act(async () => {
				fireEvent.change(titleInput, { target: { value: 'Albert Einstein' } });
			});
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

		it('renders a hidden input field for pageId', async () => {
			render(<SearchForm {...defaultProps} />);
			expect(screen.getByTestId('pageId-input')).toBeInTheDocument();
			// suppress the warning due to delayed rendering by debouncing
			await act(async () => {});
		});

		it('debounces the API call and updates pageId on success', async () => {
			const mockFetchPageId = vi.fn().mockResolvedValue(123);
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId
			);

			render(<SearchForm {...emptySearchProps} />);

			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);

			await act(async () => {
				fireEvent.change(titleInput, { target: { value: 'New Title' } });
			});
			expect(mockFetchPageId).not.toHaveBeenCalled();

			await waitFor(() => expect(mockFetchPageId).toHaveBeenCalledTimes(1), {
				timeout: 500,
			});
			expect(mockFetchPageId).toHaveBeenCalledWith(
				emptySearchProps.searchState.wiki.url,
				'New Title'
			);

			const pageIdInput = screen.getByTestId(
				'pageId-input'
			) as HTMLInputElement;
			expect(pageIdInput.value).toBe('123');
		});

		it('displays an error message when the API call fails', async () => {
			const mockFetchPageId = vi.fn().mockRejectedValue(new Error('API Error'));
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId
			);
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			render(<SearchForm {...emptySearchProps} />);

			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);

			await act(async () => {
				fireEvent.change(titleInput, { target: { value: 'Invalid Title' } });
			});

			await waitFor(() => expect(mockFetchPageId).toHaveBeenCalled(), {
				timeout: 500,
			});

			const errorMessage = await screen.findByText(/Error fetching page ID/i);
			expect(errorMessage).toBeInTheDocument();

			const pageIdInput = screen.getByTestId(
				'pageId-input'
			) as HTMLInputElement;
			expect(pageIdInput.value).toBe('');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error fetching page ID:',
				new Error('API Error')
			);
		});
	});
}
