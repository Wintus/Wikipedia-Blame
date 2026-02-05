import './App.css';
import { useActionState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SearchForm } from './components/SearchForm';
import { ResultView } from './components/ResultView';
import { searchAction, initSearchState } from './actions/search';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1 * 60 * 60 * 1000, // 1 hour (page IDs are immutable)
			retry: 1,
		},
	},
});

function App() {
	const [searchState, formAction, isPending] = useActionState(
		searchAction,
		initSearchState
	);
	const hasSearched = searchState.searchCount > 0;

	return (
		<QueryClientProvider client={queryClient}>
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
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}

export default App;
