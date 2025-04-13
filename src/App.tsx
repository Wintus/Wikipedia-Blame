import { useActionState } from 'react';
import './App.css';
import { SearchForm } from './components/SearchForm';
import { ResultView } from './components/ResultView';
import { searchAction, defaultSearchResult } from './actions/searchActions';

function App() {
	const [searchState, formAction, isPending] = useActionState(
		searchAction,
		defaultSearchResult
	);

	return (
		<div className="app">
			<header>
				<h1>Wikipedia Blame</h1>
				<p>Find an occurrence of text in a Wikipedia article</p>
			</header>
			<main>
				<SearchForm formAction={formAction} isPending={isPending} />
				{searchState.searchCount > 0 && (
					<ResultView result={searchState} isPending={isPending} />
				)}
			</main>
		</div>
	);
}

export default App;
