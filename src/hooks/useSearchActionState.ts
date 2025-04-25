import { useActionState } from 'react';
import { searchAction, defaultSearchResult } from '../actions/search';

export function useSearchActionState() {
	return useActionState(searchAction, defaultSearchResult);
}
