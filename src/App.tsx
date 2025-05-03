import './App.css';
import { useActionState, useState } from 'react';
import { Form as SearchForm } from './features/search/components/Form';
import { ResultView } from './features/search/components/ResultView';
import { WikiSelector } from './features/wikiSelector/components/WikiSelector';
import { PageTitleInput } from './features/pageInput/components/PageTitleInput';
import {
	searchAction,
	initSearchState,
} from './features/search/actions/search';

function App() {
	const [searchState, formAction, isPending] = useActionState(
		searchAction,
		initSearchState
	);
	const hasSearched = searchState.searchCount > 0;
	const [wikiUrl, setWikiUrl] = useState(searchState.wikiUrl);

	return (
		<div className="app">
			<header>
				<h1>Wikipedia Blame</h1>
				<p>Find an occurrence of text in a Wikipedia article</p>
			</header>
			<main>
				<SearchForm
					formAction={formAction}
					isPending={isPending}
					searchState={searchState}
					wikiSelector={
						<WikiSelector selectedWiki={wikiUrl} onChange={setWikiUrl} />
					}
					pageTitleInput={
						<PageTitleInput
							initialPageTitle={searchState.pageTitle}
							wikiUrl={wikiUrl}
						/>
					}
				/>
				{hasSearched && (
					<ResultView result={searchState} isPending={isPending} />
				)}
			</main>
		</div>
	);
}

export default App;

// MARK: in-source tests
if (import.meta.vitest) {
	// TODO: add tests for App component
}
