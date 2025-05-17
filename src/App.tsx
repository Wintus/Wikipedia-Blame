import './App.css';
import { useActionState } from 'react';
import { SearchForm } from './components/SearchForm';
import { ResultView } from './components/ResultView';
import { searchAction, initSearchState } from './actions/search';

function App() {
	const [searchState, formAction, isPending] = useActionState(
		searchAction,
		initSearchState
	);

	return (
		<div className="app">
			<header>
				<h1>Wikipedia Blame</h1>
				<p>Find an occurrence of text in a Wikipedia article</p>
			</header>
			<main>
				<SearchForm
					searchState={searchState}
					formAction={formAction}
					isPending={isPending}
				/>
				<ResultView result={searchState} isPending={isPending} />
			</main>
		</div>
	);
}

export default App;
