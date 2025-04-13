import { WikiSelector } from './WikiSelector';

type SearchFormProps = {
	formAction: (formData: FormData) => void;
	isPending: boolean;
};

export function SearchForm({ formAction, isPending }: SearchFormProps) {
	return (
		<form action={formAction} className="search-form" name="searchForm">
			<WikiSelector />

			<div className="form-group">
				<label htmlFor="page-title">Wiki Article Title:</label>
				<input
					type="text"
					id="page-title"
					name="pageTitle"
					placeholder="e.g. Albert Einstein"
					required
				/>
			</div>

			<div className="form-group">
				<label htmlFor="target-text">Text to Find:</label>
				<textarea
					id="target-text"
					name="targetText"
					placeholder="Enter text to search for in the article's history"
					required
				/>
			</div>

			<button type="submit" disabled={isPending}>
				{isPending ? 'Searching...' : 'Find An Occurrence'}
			</button>
		</form>
	);
}
