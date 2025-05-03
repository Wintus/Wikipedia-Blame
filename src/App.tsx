import './App.css';
import { useActionState } from 'react';
import { SearchForm } from './features/search/components/SearchForm';
import { ResultView } from './features/search/components/ResultView';
import { searchAction, initSearchState } from './features/search/actions/search';

function App() {
	const [searchState, formAction, isPending] = useActionState(
		searchAction,
		initSearchState
	);
	const hasSearched = searchState.searchCount > 0;

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
				/>
				{hasSearched && (
					<ResultView result={searchState} isPending={isPending} />
				)}
			</main>
		</div>
	);
}

export default App;
