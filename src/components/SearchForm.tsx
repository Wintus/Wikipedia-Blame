import { FormEvent, useState } from 'react';
import { WikiLanguage } from '../types';
import { LanguageSelector } from './LanguageSelector';

type SearchFormProps = {
	onSearch: (
		pageTitle: string,
		targetText: string,
		language: WikiLanguage
	) => void;
	isLoading: boolean;
};

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
	const [pageTitle, setPageTitle] = useState('');
	const [targetText, setTargetText] = useState('');
	const [language, setLanguage] = useState<WikiLanguage>('en');

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (pageTitle && targetText) {
			onSearch(pageTitle, targetText, language);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="search-form">
			<div className="form-group">
				<label htmlFor="page-title">Wikipedia Article Title:</label>
				<input
					type="text"
					id="page-title"
					value={pageTitle}
					onChange={(e) => setPageTitle(e.target.value.trim())}
					placeholder="e.g. Albert Einstein"
					required
				/>
			</div>

			<div className="form-group">
				<label htmlFor="target-text">Text to Find:</label>
				<textarea
					id="target-text"
					value={targetText}
					onChange={(e) => setTargetText(e.target.value.trim())}
					placeholder="Enter text to search for in the article's history"
					required
				/>
			</div>

			<LanguageSelector language={language} onChange={setLanguage} />

			<button type="submit" disabled={isLoading}>
				{isLoading ? 'Searching...' : 'Find An Occurrence'}
			</button>
		</form>
	);
}
