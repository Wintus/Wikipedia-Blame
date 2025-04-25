import './App.css';
import { SearchForm } from './components/SearchForm';
import { ResultView } from './components/ResultView';
import { useSearchActionState } from './hooks/useSearchActionState';

function App() {
	const [searchState, formAction, isPending] = useSearchActionState();

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
				{searchState.searchCount > 0 && (
					<ResultView result={searchState} isPending={isPending} />
				)}
			</main>
		</div>
	);
}

export default App;
