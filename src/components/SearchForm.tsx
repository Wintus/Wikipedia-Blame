import { useState } from 'react';
import { type QueryState } from '../state';
import { WikiSelector } from './WikiSelector';
import { PageTitleInput } from './PageTitleInput';

type Props = {
	formAction: (formData: FormData) => void;
	isPending: boolean;
	state: QueryState;
};

export function SearchForm({ formAction, isPending, state }: Props) {
	const [wikiUrl, setWikiUrl] = useState(state.wikiUrl);

	return (
		<form action={formAction} className="search-form" name="searchForm">
			{/* React resets uncontrolled fields after the action, and a select resets
			    to its mount-time default. Re-seed it when an outcome arrives so the
			    reset cannot revert the user's pick. */}
			<WikiSelector
				key={state.wikiUrl.href}
				defaultWiki={wikiUrl}
				onChange={setWikiUrl}
			/>

			<PageTitleInput wikiUrl={wikiUrl} />

			<div className="form-group">
				<label htmlFor="target-text">Text to Find:</label>
				<textarea
					id="target-text"
					name="targetText"
					defaultValue={state.targetText}
					placeholder="Enter text to search for in the article's history"
					required
				/>
			</div>

			<details>
				<summary>Options:</summary>

				<div className="form-group">
					<label htmlFor="start-rev-id">Search from Rev ID (optional):</label>
					<input
						type="search"
						pattern="\d*"
						id="start-rev-id"
						name="startRevId"
						placeholder="Enter a revision ID to start searching from"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="end-rev-id">End Rev ID (optional):</label>
					<input
						type="search"
						pattern="\d*"
						id="end-rev-id"
						name="endRevId"
						placeholder="Enter a revision ID to search up to"
					/>
				</div>

				<fieldset className="form-group" key={state.order}>
					<legend>Search Order:</legend>
					<label>
						<input
							type="radio"
							name="order"
							value="asc"
							defaultChecked={state.order === 'asc'}
						/>
						Ascending (Older First)
					</label>

					<label>
						<input
							type="radio"
							name="order"
							value="desc"
							defaultChecked={state.order === 'desc'}
						/>
						Descending (Newer First)
					</label>
				</fieldset>
			</details>

			<button type="submit" disabled={isPending}>
				{isPending ? 'Searching...' : 'Find An Occurrence'}
			</button>
		</form>
	);
}

// MARK: in-source tests
if (import.meta.vitest) {
	const { describe, it, expect, vi, beforeEach, afterAll } = import.meta.vitest;
	const { render, screen, act, waitFor } =
		await import('@testing-library/react');
	const { userEvent } = await import('@testing-library/user-event');
	const MediaWikiAPIs = await import('../services/MediaWikiAPIs');
	const { QueryClient, QueryClientProvider } =
		await import('@tanstack/react-query');
	type QueryClientType = InstanceType<typeof QueryClient>;

	describe('SearchForm', () => {
		const mockFormAction = vi.fn();
		let queryClient: QueryClientType;
		const defaultQueryState = {
			wikiUrl: new URL('https://en.wikipedia.org'),
			pageTitle: 'Initial Title',
			targetText: 'Initial Text',
			order: 'asc',
		} as const satisfies QueryState;

		const emptyQueryState = {
			wikiUrl: new URL('https://en.wikipedia.org'),
			pageTitle: '',
			targetText: 'Initial Text',
			order: 'asc',
		} as const satisfies QueryState;

		const emptySearchProps = {
			formAction: mockFormAction,
			isPending: false,
			state: emptyQueryState,
		};

		const defaultProps = {
			formAction: mockFormAction,
			isPending: false,
			state: defaultQueryState,
		};

		const mockFetchPageId = vi.fn().mockResolvedValue(123);

		beforeEach(() => {
			mockFormAction.mockClear();
			mockFetchPageId.mockClear();
			queryClient = new QueryClient({
				defaultOptions: { queries: { retry: false } },
			});
			vi.spyOn(MediaWikiAPIs, 'fetchPageId').mockImplementation(
				mockFetchPageId,
			);
		});

		afterAll(() => {
			vi.restoreAllMocks();
		});

		const renderWithQuery = (component: React.ReactElement) => {
			return render(
				<QueryClientProvider client={queryClient}>
					{component}
				</QueryClientProvider>,
			);
		};

		it('renders form inputs and button', async () => {
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			expect(screen.getByLabelText(/Wiki Article Title:/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Text to Find:/i)).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /Find An Occurrence/i }),
			).toBeInTheDocument();
		});

		it('submits form with correct FormData', async () => {
			const user = userEvent.setup();
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
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
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			expect(
				screen.getByLabelText(/Search from Rev ID \(optional\):/i),
			).toBeInTheDocument();
		});

		it('renders the endRevId input field', async () => {
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			expect(
				screen.getByLabelText(/End Rev ID \(optional\):/i),
			).toBeInTheDocument();
		});

		it('submits form with correct FormData including endRevId', async () => {
			const user = userEvent.setup();
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
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
				renderWithQuery(
					<SearchForm
						{...defaultProps}
						state={{
							...defaultQueryState,
							pageTitle: '',
							targetText: '',
						}}
					/>,
				),
			);
			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});
			await user.click(button);
			expect(mockFormAction).not.toHaveBeenCalled();
		});

		it('disables the button when isPending is true', async () => {
			await act(async () =>
				renderWithQuery(
					<SearchForm
						formAction={mockFormAction}
						isPending={true}
						state={defaultQueryState}
					/>,
				),
			);
			const button = screen.getByRole('button');
			expect(button).toBeDisabled();
		});

		it('renders the WikiSelector component', async () => {
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			expect(screen.getByLabelText(/Wiki Site:/i)).toBeInTheDocument();
		});

		it('keeps the selected option after form submission', async () => {
			const { fireEvent } = await import('@testing-library/react');
			const user = userEvent.setup();
			const { rerender } = await act(async () =>
				renderWithQuery(<SearchForm {...defaultProps} />),
			);
			const wikiSelector =
				await screen.findByLabelText<HTMLSelectElement>(/Wiki Site:/i);

			await act(async () => {
				// use fireEvent due to waring of act unsupported
				fireEvent.change(wikiSelector, {
					target: { value: 'https://ja.wikipedia.org/' },
				});
			});

			expect(wikiSelector.value).toBe('https://ja.wikipedia.org/');

			// The page title is required, so fill it before submitting
			await user.type(
				screen.getByLabelText(/Wiki Article Title:/i),
				'Albert Einstein',
			);

			const button = screen.getByRole('button', {
				name: /Find An Occurrence/i,
			});
			await user.click(button);

			expect(mockFormAction).toHaveBeenCalledTimes(1);

			// The action resets the form, then useActionState rerenders with the query
			await act(async () =>
				rerender(
					<QueryClientProvider client={queryClient}>
						<SearchForm
							{...defaultProps}
							state={{
								...defaultQueryState,
								wikiUrl: new URL('https://ja.wikipedia.org'),
							}}
						/>
					</QueryClientProvider>,
				),
			);

			expect(
				screen.getByLabelText<HTMLSelectElement>(/Wiki Site:/i).value,
			).toBe('https://ja.wikipedia.org/');
		});

		it('preserves the typed page title when wiki site changes', async () => {
			const { fireEvent } = await import('@testing-library/react');
			const user = userEvent.setup();
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			const titleInput = screen.getByLabelText(
				/Wiki Article Title:/i,
			) as HTMLInputElement;

			// User types a title
			await user.clear(titleInput);
			await user.type(titleInput, 'Albert Einstein');
			expect(titleInput.value).toBe('Albert Einstein');

			// Switch wiki site
			const wikiSelector =
				screen.getByLabelText<HTMLSelectElement>(/Wiki Site:/i);
			await act(async () => {
				// use fireEvent due to warning of act unsupported
				fireEvent.change(wikiSelector, {
					target: { value: 'https://ja.wikipedia.org/' },
				});
			});

			// PageTitleInput stays mounted → the typed title is preserved
			const titleAfterSwitch = screen.getByLabelText(
				/Wiki Article Title:/i,
			) as HTMLInputElement;
			expect(titleAfterSwitch.value).toBe('Albert Einstein');
		});

		it('does not overwrite the typed page title when state changes', async () => {
			const user = userEvent.setup();
			const { rerender } = await act(async () =>
				renderWithQuery(<SearchForm {...defaultProps} />),
			);
			const titleInput = screen.getByLabelText(
				/Wiki Article Title:/i,
			) as HTMLInputElement;

			await user.type(titleInput, 'Albert Einstein');
			expect(titleInput.value).toBe('Albert Einstein');

			await act(async () =>
				rerender(
					<QueryClientProvider client={queryClient}>
						<SearchForm
							{...defaultProps}
							state={{
								...defaultQueryState,
								pageTitle: 'Some Other Title',
							}}
						/>
					</QueryClientProvider>,
				),
			);

			const titleAfterUpdate = screen.getByLabelText(
				/Wiki Article Title:/i,
			) as HTMLInputElement;
			expect(titleAfterUpdate.value).toBe('Albert Einstein');
		});

		it('looks up the page ID using the currently selected wiki URL', async () => {
			const { fireEvent } = await import('@testing-library/react');
			const user = userEvent.setup();
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const wikiSelector =
				screen.getByLabelText<HTMLSelectElement>(/Wiki Site:/i);

			await act(async () => {
				// use fireEvent due to warning of act unsupported
				fireEvent.change(wikiSelector, {
					target: { value: 'https://ja.wikipedia.org/' },
				});
			});

			await user.type(titleInput, 'Albert Einstein');

			await waitFor(() => {
				const call = mockFetchPageId.mock.calls.find(
					([, title]) => title === 'Albert Einstein',
				);
				expect(call).toBeDefined();
				expect((call?.[0] as URL).href).toBe('https://ja.wikipedia.org/');
			});
		});

		it('renders initial values from state except the page title', async () => {
			await act(async () =>
				renderWithQuery(
					<SearchForm
						formAction={mockFormAction}
						isPending={false}
						state={{
							wikiUrl: new URL('https://ja.wikipedia.org'),
							pageTitle: 'Initial Page Title',
							targetText: 'Initial Target Text',
							order: 'asc',
						}}
					/>,
				),
			);

			const titleInput = screen.getByLabelText(
				/Wiki Article Title:/i,
			) as HTMLInputElement;
			const textArea = screen.getByLabelText(
				/Text to Find:/i,
			) as HTMLTextAreaElement;
			const wikiSelector = screen.getByLabelText(
				/Wiki Site:/i,
			) as HTMLSelectElement;

			expect(titleInput.value).toBe('');
			expect(textArea.value).toBe('Initial Target Text');
			expect(wikiSelector.value).toBe('https://ja.wikipedia.org/');
		});

		it('renders the order radio buttons', async () => {
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			expect(
				screen.getByLabelText(/Ascending \(Older First\)/i),
			).toBeInTheDocument();
			expect(
				screen.getByLabelText(/Descending \(Newer First\)/i),
			).toBeInTheDocument();
		});

		it('sets radio defaultChecked from state and updates on rerender', async () => {
			const queryStateAsc = {
				...defaultProps.state,
				order: 'asc' as const,
			};
			const { rerender } = await act(async () =>
				renderWithQuery(
					<SearchForm {...emptySearchProps} state={queryStateAsc} />,
				),
			);

			const radioAsc = screen.getByLabelText(
				/Ascending \(Older First\)/i,
			) as HTMLInputElement;
			expect(radioAsc.defaultChecked).toBe(true);
			const radioDesc = screen.getByLabelText(
				/Descending \(Newer First\)/i,
			) as HTMLInputElement;
			expect(radioDesc.defaultChecked).toBe(false);

			const queryStateDesc = {
				...defaultProps.state,
				order: 'desc' as const,
			};
			await act(async () =>
				rerender(
					<QueryClientProvider client={queryClient}>
						<SearchForm {...defaultProps} state={queryStateDesc} />
					</QueryClientProvider>,
				),
			);
			const radioAsc2 = screen.getByLabelText(
				/Ascending \(Older First\)/i,
			) as HTMLInputElement;
			expect(radioAsc2.defaultChecked).toBe(false);
			const radioDesc2 = screen.getByLabelText(
				/Descending \(Newer First\)/i,
			) as HTMLInputElement;
			expect(radioDesc2.defaultChecked).toBe(true);
		});

		it('submits form with correct FormData including order', async () => {
			const user = userEvent.setup();
			await act(async () => renderWithQuery(<SearchForm {...defaultProps} />));
			const titleInput = screen.getByLabelText(/Wiki Article Title:/i);
			const textArea = screen.getByLabelText(/Text to Find:/i);
			const descendingRadio = screen.getByLabelText(
				/Descending \(Newer First\)/i,
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
