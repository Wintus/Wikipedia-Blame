import { FormEvent, useState } from 'react';
import { WikiSite, WIKI_SITES, OnSearchFn } from '../wiki';
import { WikiSelector } from './WikiSelector';

type SearchFormProps = {
	onSearch: OnSearchFn;
	isLoading: boolean;
};

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
	const [pageTitle, setPageTitle] = useState('');
	const [targetText, setTargetText] = useState('');
	const [selectedWiki, setSelectedWiki] = useState<WikiSite>(WIKI_SITES.ENWP);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const trimmedPageTitle = pageTitle.trim();
		const trimmedTargetText = targetText.trim();
		if (trimmedPageTitle && trimmedTargetText) {
			// no await
			onSearch(selectedWiki, trimmedPageTitle, trimmedTargetText);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="search-form">
			<WikiSelector selectedWiki={selectedWiki} onChange={setSelectedWiki} />

			<div className="form-group">
				<label htmlFor="page-title">Wiki Article Title:</label>
				<input
					type="text"
					id="page-title"
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
					value={targetText}
					onChange={(e) => setTargetText(e.target.value)}
					placeholder="Enter text to search for in the article's history"
					required
				/>
			</div>

			<button type="submit" disabled={isLoading}>
				{isLoading ? 'Searching...' : 'Find An Occurrence'}
			</button>
		</form>
	);
}
