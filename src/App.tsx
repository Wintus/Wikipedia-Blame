import { useState } from 'react';
import './App.css';
import { SearchForm } from './components/SearchForm';
import { ResultView } from './components/ResultView';
import {
	getBaseUrl,
	fetchAllRevisions,
	fetchRevisionTexts,
} from './services/WikipediaAPI';
import { findOneOccurrence } from './utils/RevisionFinder';
import {
	defaultSearchResult,
	SearchResult,
	WikiLanguage,
	OnSearchFn,
} from './types';

function App() {
	const [searchResult, setSearchResult] =
		useState<SearchResult>(defaultSearchResult);

	const handleSearch: OnSearchFn = async (
		pageTitle: string,
		targetText: string,
		language: WikiLanguage
	) => {
		setSearchResult((prev) => ({
			...prev,
			pageTitle,
			targetText,
			language,
			loading: true,
			error: null,
			revisionId: null,
		}));

		const baseUrl = getBaseUrl(language);

		try {
			// Fetch all revisions for the page
			const revisions = await fetchAllRevisions(baseUrl, pageTitle);

			// Find one occurrence of the target text
			const foundRevisionId = await findOneOccurrence(
				targetText,
				(revIds) => fetchRevisionTexts(baseUrl, revIds),
				revisions
			);

			setSearchResult((prev) => ({
				...prev,
				loading: false,
				revisionId: foundRevisionId,
			}));
		} catch (error) {
			setSearchResult((prev) => ({
				...prev,
				loading: false,
				error:
					error instanceof Error ? error.message : 'An unknown error occurred',
			}));
		}
	};

	const resultShown =
		searchResult.loading ||
		searchResult.revisionId != null ||
		searchResult.error;

	return (
		<div className="app">
			<header>
				<h1>Wikipedia Blame</h1>
				<p>Find an occurrence of text in a Wikipedia article</p>
			</header>
			<main>
				<SearchForm onSearch={handleSearch} isLoading={searchResult.loading} />
				{resultShown && <ResultView result={searchResult} />}
			</main>
		</div>
	);
}

export default App;
