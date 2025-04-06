import { useActionState } from 'react';
import './App.css';
import { SearchForm } from './components/SearchForm';
import { ResultView } from './components/ResultView';
import { searchAction } from './actions/searchActions';
import { defaultSearchResult } from './wiki';

function App() {
	const [searchResult, formAction, isPending] = useActionState(
		searchAction,
		defaultSearchResult
	);

	const resultShown =
		isPending || searchResult.revisionId != null || searchResult.error;

	return (
		<div className="app">
			<header>
				<h1>Wikipedia Blame</h1>
				<p>Find an occurrence of text in a Wikipedia article</p>
			</header>
			<main>
				<SearchForm formAction={formAction} isPending={isPending} />
				{resultShown && (
					<ResultView result={searchResult} isPending={isPending} />
				)}
			</main>
		</div>
	);
}

export default App;
