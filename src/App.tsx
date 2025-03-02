import { useState } from 'react';
import './App.css';
import { SearchForm } from './components/SearchForm';
import { ResultView } from './components/ResultView';
import { WikipediaAPI } from './services/WikipediaAPI';
import { findFirstOccurrence } from './utils/RevisionFinder';
import { SearchResult, WikiLanguage } from './types';

function App() {
	const [searchResult, setSearchResult] = useState<SearchResult>({
		pageTitle: '',
		targetText: '',
		revisionId: null,
		loading: false,
		error: null,
		language: 'en',
	});

	const handleSearch = async (
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

		try {
			// Fetch all revisions for the page
			const revisions = await WikipediaAPI.getAllRevisions(pageTitle, language);

			// Find the first occurrence of the target text
			const firstRevisionId = await findFirstOccurrence(
				targetText,
				revisions,
				language
			);

			if (firstRevisionId) {
				// Fetch additional details about the revision
				const revisionText = await WikipediaAPI.getRevisionText(
					firstRevisionId,
					language
				);

				setSearchResult((prev) => ({
					...prev,
					revisionId: firstRevisionId,
					loading: false,
				}));
			} else {
				setSearchResult((prev) => ({
					...prev,
					revisionId: null,
					loading: false,
				}));
			}
		} catch (error) {
			setSearchResult((prev) => ({
				...prev,
				loading: false,
				error:
					error instanceof Error ? error.message : 'An unknown error occurred',
			}));
		}
	};

	return (
		<div className="app">
			<header>
				<h1>Wikipedia Blame</h1>
				<p>Find the first occurrence of text in a Wikipedia article</p>
			</header>
			<main>
				<SearchForm onSearch={handleSearch} isLoading={searchResult.loading} />
				{(searchResult.loading ||
					searchResult.revisionId !== null ||
					searchResult.error) && <ResultView result={searchResult} />}
			</main>
		</div>
	);
}

export default App;
