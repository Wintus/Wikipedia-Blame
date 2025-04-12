import { useState } from 'react';
import { type WikiSite, WIKI_SITES } from '../wiki';
import { WikiSelector } from './WikiSelector';

type SearchFormProps = {
	formAction: (formData: FormData) => void;
	isPending: boolean;
};

export function SearchForm({ formAction, isPending }: SearchFormProps) {
	const [pageTitle, setPageTitle] = useState('');
	const [targetText, setTargetText] = useState('');
	const [selectedWiki, setSelectedWiki] = useState<WikiSite>(WIKI_SITES.ENWP);

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

			<button type="submit" disabled={isPending}>
				{isPending ? 'Searching...' : 'Find An Occurrence'}
			</button>
		</form>
	);
}
