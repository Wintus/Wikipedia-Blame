import { useState } from 'react';
import { type SearchState, type WikiSite } from '../wiki';
import { WikiSelector } from './WikiSelector';

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

	return (
		<form action={formAction} className="search-form" name="searchForm">
			<WikiSelector selectedWiki={selectedWiki} onChange={setSelectedWiki} />

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
