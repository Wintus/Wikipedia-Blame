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
